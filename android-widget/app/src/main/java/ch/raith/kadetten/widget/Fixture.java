package ch.raith.kadetten.widget;

import org.json.JSONArray;
import org.json.JSONObject;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Spielauswahl ausschliesslich aus bestätigten Daten, in Zürcher Zeit. */
final class Fixture {
    static final ZoneId ZURICH = ZoneId.of("Europe/Zurich");
    final String id, home, away, league, time;
    final LocalDate date;
    final Integer homeScore, awayScore;

    Fixture(String id, String home, String away, String league, String date, String time, Integer hs, Integer as) {
        this.id = id;
        this.home = home;
        this.away = away;
        this.league = league;
        this.date = LocalDate.parse(date);
        this.time = time;
        if (!time.isEmpty()) LocalTime.parse(time);
        this.homeScore = hs;
        this.awayScore = as;
    }

    static List<Fixture> parse(String json) throws Exception {
        JSONArray rows = new JSONObject(json).getJSONArray("games");
        if (rows.length() == 0 || rows.length() > 5000) throw new IllegalArgumentException("Empty or excessive snapshot");
        List<Fixture> result = new ArrayList<>();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.getJSONObject(i);
            String id = row.getString("id"), home = row.getString("home"), away = row.getString("away");
            if (!id.matches("[A-Za-z0-9_-]{1,80}") || home.trim().isEmpty() || away.trim().isEmpty())
                throw new IllegalArgumentException("Invalid fixture");
            Integer hs = null, as = null;
            if (row.has("score") && !row.isNull("score")) {
                JSONArray score = row.getJSONArray("score");
                if (score.length() != 2) throw new IllegalArgumentException("Invalid score");
                hs = goal(score.get(0));
                as = goal(score.get(1));
            }
            Fixture fixture = new Fixture(id, home, away, row.getString("league"), row.getString("date"),
                    row.optString("time", ""), hs, as);
            if (isKadetten(home) || isKadetten(away)) result.add(fixture);
        }
        if (result.isEmpty()) throw new IllegalArgumentException("No first-team fixtures");
        return result;
    }

    private static int goal(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException("Missing score");
        double number = ((Number) value).doubleValue();
        if (!Double.isFinite(number) || number < 0 || number > 200 || number != Math.floor(number))
            throw new IllegalArgumentException("Invalid score");
        return (int) number;
    }

    static boolean isKadetten(String name) {
        return name.equals("Kadetten Schaffhausen") || name.equals("Kadetten");
    }

    static String shortName(String name) {
        if (isKadetten(name)) return "Kadetten";
        return name.replaceFirst("^(HC |HSC |BSV |TSV |GC Amicitia )", "");
    }

    /** Nur die vom bestehenden Frontend ausgelieferten Wappenpfade zulassen. */
    static String logoPath(String path) {
        String normalized = path.replaceAll("\\.(png|jpe?g)$", ".webp");
        java.util.regex.Matcher match = java.util.regex.Pattern
                .compile("^assets/(?:clubs/)?(club-[0-9]+\\.webp)$").matcher(normalized);
        return match.matches() ? "assets/clubs/" + match.group(1) : null;
    }

    boolean ended() {
        return homeScore != null && awayScore != null;
    }

    ZonedDateTime kickoff() {
        return date.atTime(time.isEmpty() ? LocalTime.MAX : LocalTime.parse(time)).atZone(ZURICH);
    }

    static Fixture choose(List<Fixture> fixtures, Instant instant) {
        LocalDate today = instant.atZone(ZURICH).toLocalDate();
        List<Fixture> sorted = new ArrayList<>(fixtures);
        sorted.sort(Comparator.comparing(Fixture::kickoff));
        Fixture finished = null;
        for (Fixture fixture : sorted) {
            if (!fixture.date.equals(today)) continue;
            if (!fixture.ended()) return fixture;
            finished = fixture;
        }
        if (finished != null) return finished;
        for (Fixture fixture : sorted) {
            if (!fixture.ended() && !fixture.kickoff().toInstant().isBefore(instant)) return fixture;
        }
        return lastResult(sorted, instant);
    }

    static Fixture lastResult(List<Fixture> fixtures, Instant now) {
        Fixture result = null;
        for (Fixture fixture : fixtures) {
            if (fixture.ended() && !fixture.kickoff().toInstant().isAfter(now)
                    && (result == null || fixture.kickoff().isAfter(result.kickoff()))) result = fixture;
        }
        return result;
    }

    String dateLine() {
        return date.format(DateTimeFormatter.ofPattern("EEE, dd.MM.yyyy", Locale.forLanguageTag("de-CH")))
                + (time.isEmpty() ? " · Anspielzeit offen" : "");
    }

    String resultLine() {
        return shortName(home) + " " + homeScore + ":" + awayScore + " " + shortName(away);
    }
}
