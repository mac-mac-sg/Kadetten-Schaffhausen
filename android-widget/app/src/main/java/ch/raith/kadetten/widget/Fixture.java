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
        this.id=id; this.home=home; this.away=away; this.league=league; this.date=LocalDate.parse(date); this.time=time;
        if (!time.isEmpty()) LocalTime.parse(time);
        this.homeScore=hs; this.awayScore=as;
    }
    static List<Fixture> parse(String json) throws Exception {
        JSONArray rows = new JSONObject(json).getJSONArray("games");
        if (rows.length() == 0 || rows.length() > 5000) throw new IllegalArgumentException("Empty or excessive snapshot");
        List<Fixture> result = new ArrayList<>();
        for (int i=0;i<rows.length();i++) {
            JSONObject r=rows.getJSONObject(i);
            String id=r.getString("id"), home=r.getString("home"), away=r.getString("away");
            if (!id.matches("[A-Za-z0-9_-]{1,80}") || home.isBlank() || away.isBlank()) throw new IllegalArgumentException("Invalid fixture");
            Integer hs=null, as=null;
            if (r.has("score") && !r.isNull("score")) {
                JSONArray score=r.getJSONArray("score");
                if (score.length()!=2) throw new IllegalArgumentException("Invalid score");
                hs=goal(score.get(0)); as=goal(score.get(1));
            }
            Fixture f=new Fixture(id,home,away,r.getString("league"),r.getString("date"),r.optString("time", ""),hs,as);
            if (isKadetten(home) || isKadetten(away)) result.add(f);
        }
        if (result.isEmpty()) throw new IllegalArgumentException("No first-team fixtures");
        return result;
    }
    private static int goal(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException("Missing score");
        double number=((Number)value).doubleValue();
        if (number<0 || number>200 || number!=Math.floor(number)) throw new IllegalArgumentException("Invalid score");
        return (int)number;
    }
    static boolean isKadetten(String name) { return name.equals("Kadetten Schaffhausen") || name.equals("Kadetten"); }
    boolean ended() { return homeScore!=null && awayScore!=null; }
    ZonedDateTime kickoff() { return date.atTime(time.isEmpty()?LocalTime.MAX:LocalTime.parse(time)).atZone(ZURICH); }
    static Fixture choose(List<Fixture> fixtures, Instant instant) {
        LocalDate today=instant.atZone(ZURICH).toLocalDate();
        List<Fixture> sorted=new ArrayList<>(fixtures); sorted.sort(Comparator.comparing(Fixture::kickoff));
        Fixture finished=null;
        for (Fixture f:sorted) if(f.date.equals(today) && (f.league.equals("QHL") || f.league.equals("EHL"))) {
            if(!f.ended()) return f;
            finished=f;
        }
        if(finished!=null) return finished;
        for(Fixture f:sorted) if(!f.ended() && !f.kickoff().toInstant().isBefore(instant)) return f;
        return null;
    }
    String dateLine() {
        return date.format(DateTimeFormatter.ofPattern("EEE, dd.MM.", Locale.forLanguageTag("de-CH"))) +
                (time.isEmpty()?" · Anspielzeit offen":" · "+time+" Uhr");
    }
}
