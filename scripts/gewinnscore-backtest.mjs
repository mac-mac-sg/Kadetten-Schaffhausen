// Prüfrechnung für einen Kadetten-Gewinnscore: Wie gut sagt ein einfaches Modell aus Tabelle, Heimvorteil und Form
// die Resultate vergangener QHL-Saisons voraus? Liest nur die öffentliche SHV-Schnittstelle, schreibt nichts.
// Aufruf: node scripts/gewinnscore-backtest.mjs [Saisons, z. B. 2022,2023,2024,2025]
// www.handball.ch liefert sein Zwischenzertifikat nicht mit. Vorher holen und Node zusätzlich geben (Prüfung bleibt an):
//   curl -fsS http://cert.ssl.com/SSL.com-TLS-I-RSA-R1.cer | openssl x509 -inform der -out sslcom.pem
//   NODE_EXTRA_CA_CERTS=sslcom.pem node scripts/gewinnscore-backtest.mjs
// Mit dem dritten Argument «cup» prüft es zusätzlich Mobiliar-Cup-Spiele zwischen zwei QHL-Teams (Heimvorteil 1,5 und 2 Tore, ohne Remis):
//   node scripts/gewinnscore-backtest.mjs 2021,2022,2023,2024,2025 cup
// Ergebnis vom 16.11.2026 (QHL 2021–2025, 809 Spiele): Heimvorteil 1,5 Tore, Streuung 4,5 Tore, Form 2, Vorsaison-Gewicht 2;
// Prüfsaison 2025: 74 % richtige Siegertipps (Grundquote 57 %), Brier 0,35 (Grundquote 0,53).
const ENDPOINT = 'https://www.handball.ch/Umbraco/Api/MatchCenter/Query';
const QUERY =
  'query($clubId:Int,$seasonId:Int){games(clubId:$clubId,seasonId:$seasonId){objectId isLive gameStatusId seasonId gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName}}';
const CLUBS = [140364, 140561, 140570, 288821, 164406, 140576, 140566, 140684, 140558, 140492];
const SEASONS = (process.argv[2] || '2021,2022,2023,2024,2025').split(',').map(Number);

async function query(variables) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept-Language': 'de'},
        body: JSON.stringify({query: QUERY, variables}),
        signal: AbortSignal.timeout(20000)
      });
      if (r.ok) return (await r.json()).data;
      console.log('SHV HTTP ' + r.status);
    } catch (e) {
      console.log('SHV Fehler: ' + (e.cause?.code || e.message));
    }
    await new Promise(res => setTimeout(res, 1500 * (i + 1)));
  }
  throw Error('SHV nicht erreichbar');
}

const norm = n =>
  String(n || '')
    .replace(/^TSV /, '')
    .trim();
async function season(seasonId) {
  const all = new Map(),
    leagues = new Map();
  for (const clubId of CLUBS) {
    const data = await query({clubId, seasonId});
    for (const g of data?.games || []) {
      leagues.set(g.leagueShortName, (leagues.get(g.leagueShortName) || 0) + 1);
      if (g.seasonId !== seasonId || g.leagueShortName !== 'QHL' || g.isLive) continue;
      if (![g.homeTeamScore, g.awayTeamScore].every(v => Number.isInteger(v) && v >= 0) || g.homeTeamScore + g.awayTeamScore === 0)
        continue;
      all.set(g.objectId, {
        id: g.objectId,
        at: Date.parse(g.gameDateTime),
        home: norm(g.homeTeamName),
        away: norm(g.awayTeamName),
        hs: g.homeTeamScore,
        as: g.awayTeamScore
      });
    }
  }
  return {games: [...all.values()].sort((a, b) => a.at - b.at), leagues: Object.fromEntries(leagues)};
}

// Normalverteilung
const erf = x => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x)),
    y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return Math.sign(x) * y;
};
const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));

/** Vorhersagen in Spielreihenfolge. Stärke = Tordifferenz pro Spiel, geschrumpft (k) und mit Vorsaison gemischt; Form = letzte 5. */
function predict(games, prior, {H, sigma, k = 3, w = 0.5, f = 1.5, minGames = 3}) {
  const teams = new Map(),
    out = [];
  const t = name => teams.get(name) || teams.set(name, {n: 0, gd: 0, last: []}).get(name);
  const strength = name => {
    const s = t(name),
      p = prior.get(name) ?? 0;
    return (s.gd + k * w * p) / (s.n + k);
  };
  const form = name => {
    const s = t(name);
    if (s.last.length < 3) return 0;
    const ppg = s.last.reduce((a, b) => a + b, 0) / s.last.length;
    return ppg - 1; // −1 … +1
  };
  for (const g of games) {
    const h = t(g.home),
      a = t(g.away);
    if (h.n >= minGames && a.n >= minGames) {
      const m = (strength(g.home) - strength(g.away)) / 2 + H + f * (form(g.home) - form(g.away));
      const pH = 1 - Phi((0.5 - m) / sigma),
        pA = Phi((-0.5 - m) / sigma),
        pD = 1 - pH - pA;
      out.push({...g, m, pH, pD, pA, res: g.hs > g.as ? 'H' : g.hs < g.as ? 'A' : 'D'});
    }
    const d = g.hs - g.as;
    for (const [s, sign] of [
      [h, 1],
      [a, -1]
    ]) {
      s.n++;
      s.gd += sign * d;
      s.last.push(sign * d > 0 ? 2 : sign * d < 0 ? 0 : 1);
      if (s.last.length > 5) s.last.shift();
    }
  }
  return {out, teams};
}

const score = preds => {
  let brier = 0,
    logloss = 0,
    hits = 0;
  for (const p of preds) {
    const o = {H: p.res === 'H' ? 1 : 0, D: p.res === 'D' ? 1 : 0, A: p.res === 'A' ? 1 : 0};
    brier += (p.pH - o.H) ** 2 + (p.pD - o.D) ** 2 + (p.pA - o.A) ** 2;
    logloss -= Math.log(Math.max(1e-6, p.res === 'H' ? p.pH : p.res === 'A' ? p.pA : p.pD));
    const pick = p.pH >= p.pA ? 'H' : 'A';
    if (pick === p.res) hits++;
  }
  return {n: preds.length, brier: brier / preds.length, logloss: logloss / preds.length, accuracy: hits / preds.length};
};

const data = {};
for (const s of SEASONS) {
  data[s] = await season(s);
  console.log(`Saison ${s}: ${data[s].games.length} QHL-Spiele; Ligen: ${JSON.stringify(data[s].leagues)}`);
}
const allGames = SEASONS.flatMap(s => data[s].games);
const margins = allGames.map(g => g.hs - g.as);
const meanH = margins.reduce((a, b) => a + b, 0) / margins.length;
const draws = allGames.filter(g => g.hs === g.as).length / allGames.length;
const homeWins = allGames.filter(g => g.hs > g.as).length / allGames.length;
console.log(
  `Spiele gesamt ${allGames.length}; Heimvorteil Mittel ${meanH.toFixed(2)} Tore; Heimsiege ${(homeWins * 100).toFixed(1)} %; Unentschieden ${(draws * 100).toFixed(1)} %`
);

// Vorsaison-Stärken
const priors = new Map();
for (let i = 0; i < SEASONS.length; i++) {
  const prev = i ? data[SEASONS[i - 1]].games : [];
  const m = new Map();
  for (const g of prev) {
    for (const [n, d] of [
      [g.home, g.hs - g.as],
      [g.away, g.as - g.hs]
    ]) {
      const v = m.get(n) || {n: 0, gd: 0};
      v.n++;
      v.gd += d;
      m.set(n, v);
    }
  }
  priors.set(SEASONS[i], new Map([...m].map(([n, v]) => [n, v.gd / v.n])));
}

// Rasterprüfung: Parameter auf den ersten Saisons wählen, auf der letzten prüfen (keine Überanpassung an die Prüfsaison).
const train = SEASONS.slice(1, -1),
  test = SEASONS.slice(-1);
const run = (seasons, p) => seasons.flatMap(s => predict(data[s].games, priors.get(s), p).out);
let best = null;
for (const H of [1, 1.5, 2])
  for (const sigma of [3.5, 4, 4.5, 5, 5.5])
    for (const f of [1, 2, 3, 4])
      for (const w of [1, 1.5, 2, 3]) {
        const sc = score(run(train, {H, sigma, f, w}));
        if (!best || sc.logloss < best.sc.logloss) best = {p: {H, sigma, f, w}, sc};
      }
console.log('Bestes Modell (Training ' + train.join(',') + '):', JSON.stringify(best));
const testPreds = run(test, best.p);
const testScore = score(testPreds);
// Vergleich: nur Grundquoten (immer gleiche Wahrscheinlichkeiten)
const base = testPreds.map(p => ({...p, pH: homeWins, pD: draws, pA: 1 - homeWins - draws}));
console.log('Prüfsaison ' + test.join(',') + ' Modell:', JSON.stringify(testScore));
console.log('Prüfsaison ' + test.join(',') + ' Grundquoten:', JSON.stringify(score(base)));
// Kalibrierung über alle Saisons ausser der ersten, mit den gewählten Parametern
const allPreds = run(SEASONS.slice(1), best.p);
const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.01].slice(0, -1).map((lo, i, arr) => [lo, [0.2, 0.4, 0.6, 0.8, 1.01][i]]);
console.log('Kalibrierung (vorhergesagte Heimsieg-Chance → tatsächliche Heimsiege):');
for (const [lo, hi] of bins) {
  const g = allPreds.filter(p => p.pH >= lo && p.pH < hi);
  if (g.length)
    console.log(
      `  ${Math.round(lo * 100)}–${Math.round(Math.min(hi, 1) * 100)} %: ${g.length} Spiele, vorhergesagt Ø ${((g.reduce((a, p) => a + p.pH, 0) / g.length) * 100).toFixed(0)} %, tatsächlich ${((g.filter(p => p.res === 'H').length / g.length) * 100).toFixed(0)} %`
    );
}
const kad = allPreds.filter(p => p.home === 'Kadetten Schaffhausen' || p.away === 'Kadetten Schaffhausen');
const kadScore = score(kad);
const kadWinP = kad.map(p => (p.home === 'Kadetten Schaffhausen' ? p.pH : p.pA));
const kadWon = kad.filter(p => (p.home === 'Kadetten Schaffhausen' ? p.res === 'H' : p.res === 'A')).length;
console.log(
  `Kadetten-Spiele: ${kad.length}, Ø Gewinnscore ${((kadWinP.reduce((a, b) => a + b, 0) / kad.length) * 100).toFixed(0)} %, tatsächlich gewonnen ${((kadWon / kad.length) * 100).toFixed(0)} %, Treffer ${(kadScore.accuracy * 100).toFixed(0)} %`
);
// Restunsicherheit: Streuung der Tordifferenz um die Erwartung
const res = allPreds.map(p => p.hs - p.as - p.m);
console.log(`Streuung Resultat um Erwartung: ${Math.sqrt(res.reduce((a, b) => a + b * b, 0) / res.length).toFixed(2)} Tore`);
for (const p of allPreds.filter(p => p.home === 'Kadetten Schaffhausen' || p.away === 'Kadetten Schaffhausen').slice(-8))
  console.log(
    `  Beispiel ${new Date(p.at).toISOString().slice(0, 10)} ${p.home} – ${p.away} ${p.hs}:${p.as}: Kadetten ${Math.round((p.home === 'Kadetten Schaffhausen' ? p.pH : p.pA) * 100)} %, erwartete Differenz ${(p.home === 'Kadetten Schaffhausen' ? p.m : -p.m).toFixed(1)}`
  );
console.log('JSON ' + JSON.stringify({best, testScore, base: score(base), n: allGames.length, meanH, draws, homeWins}));
// Vorsaison-Werte für die App (Tordifferenz je Spiel der letzten Saison) und Vergleich ohne Vorsaison.
const last = SEASONS.at(-1);
const lastPrior = new Map();
for (const g of data[last].games)
  for (const [n, d] of [
    [g.home, g.hs - g.as],
    [g.away, g.as - g.hs]
  ]) {
    const v = lastPrior.get(n) || {n: 0, gd: 0};
    v.n++;
    v.gd += d;
    lastPrior.set(n, v);
  }
console.log('PRIOR ' + JSON.stringify(Object.fromEntries([...lastPrior].map(([n, v]) => [n, Math.round((v.gd / v.n) * 10) / 10]))));
console.log('Ohne Vorsaison (w=0):', JSON.stringify(score(run(test, {...best.p, w: 0}))));

// Schweizer Cup zwischen zwei QHL-Teams: dieselbe Rechnung (nur QHL-Tabelle, Vorsaison, Form), kein Remis (Verlängerung).
if (process.argv[3] === 'cup') {
  const cupGames = async seasonId => {
    const found = new Map();
    for (const clubId of CLUBS) {
      for (const g of (await query({clubId, seasonId}))?.games || []) {
        const qhl = n => /\(QHL\)\s*$/.test(n || '');
        if (g.seasonId !== seasonId || g.leagueShortName !== 'Mobiliar-Cup M' || g.isLive || !qhl(g.homeTeamName) || !qhl(g.awayTeamName))
          continue;
        if (![g.homeTeamScore, g.awayTeamScore].every(v => Number.isInteger(v) && v >= 0)) continue;
        found.set(g.objectId, {
          at: Date.parse(g.gameDateTime),
          home: norm(g.homeTeamName.replace(/\s*\(QHL\)\s*$/, '')),
          away: norm(g.awayTeamName.replace(/\s*\(QHL\)\s*$/, '')),
          hs: g.homeTeamScore,
          as: g.awayTeamScore
        });
      }
    }
    return [...found.values()].sort((a, b) => a.at - b.at);
  };
  const cups = {};
  for (const sid of SEASONS.slice(1)) cups[sid] = await cupGames(sid);
  for (const H of [1.5, 2, 2.5]) {
    const rows = [];
    for (const sid of SEASONS.slice(1)) {
      const prior = priors.get(sid);
      for (const g of cups[sid]) {
        const before = data[sid].games.filter(x => x.at < g.at);
        const {out} = predict([...before, {...g, id: 'cup', at: g.at, cup: true}], prior, {H, sigma: 4.5, f: 2, w: 2});
        const hit = out.find(o => o.id === 'cup');
        if (hit) rows.push(hit);
      }
    }
    // Ohne Remis: Gleichstand nach 60 Minuten geht je zur Hälfte an Sieg und Niederlage.
    const dec = rows.map(r => ({...r, pH: r.pH + r.pD / 2, pA: r.pA + r.pD / 2, pD: 0}));
    const right = dec.filter(r => (r.pH >= r.pA ? 'H' : 'A') === r.res).length;
    const brier = dec.reduce((a, r) => a + (r.pH - (r.res === 'H' ? 1 : 0)) ** 2 + (r.pA - (r.res === 'A' ? 1 : 0)) ** 2, 0) / dec.length;
    const resid = rows.map(r => r.hs - r.as - r.m);
    console.log(
      `Cup QHL gegen QHL, Heimvorteil ${H}: ${rows.length} Spiele, richtiger Sieger ${right} (${Math.round((right / rows.length) * 100)} %), Brier (Weiterkommen) ${brier.toFixed(3)}, Streuung ${Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / resid.length).toFixed(2)} Tore, Mittel ${(resid.reduce((a, b) => a + b, 0) / resid.length).toFixed(2)}`
    );
  }
}
