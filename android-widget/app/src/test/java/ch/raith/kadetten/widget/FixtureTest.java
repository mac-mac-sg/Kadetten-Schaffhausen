package ch.raith.kadetten.widget;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.Instant;
import java.util.List;
public class FixtureTest {
    Fixture game(String id,String date,String time,Integer home,Integer away) { return new Fixture(id,"Kadetten Schaffhausen","Gast","QHL",date,time,home,away); }
    @Test public void matchdayUsesSwissDate() {
        Fixture f=game("today","2026-10-03","18:00",null,null);
        assertSame(f,Fixture.choose(List.of(f),Instant.parse("2026-10-02T22:30:00Z")));
    }
    @Test public void finishedGameStaysForRestOfMatchday() {
        Fixture f=game("final","2026-10-03","18:00",30,28);
        assertSame(f,Fixture.choose(List.of(f,game("next","2026-10-06","18:45",null,null)),Instant.parse("2026-10-03T21:00:00Z")));
    }
    @Test public void overduePendingGameIsNotInventedAsFinal() {
        Fixture f=game("pending","2026-10-03","18:00",null,null);
        assertSame(f,Fixture.choose(List.of(f),Instant.parse("2026-10-03T20:00:00Z")));assertFalse(f.ended());
    }
    @Test public void kickoffUsesSummerAndWinterTime() {
        assertEquals(Instant.parse("2026-10-03T16:00:00Z"),game("s","2026-10-03","18:00",null,null).kickoff().toInstant());
        assertEquals(Instant.parse("2026-11-03T17:00:00Z"),game("w","2026-11-03","18:00",null,null).kickoff().toInstant());
    }
    @Test public void missingTimeRemainsUnknown() { assertTrue(game("open","2026-10-04","",null,null).dateLine().contains("Anspielzeit offen")); }
    @Test public void nextFixtureIsChronological() {
        Fixture first=game("first","2026-10-04","18:00",null,null);
        assertSame(first,Fixture.choose(List.of(game("later","2026-10-06","18:00",null,null),first),Instant.parse("2026-10-03T12:00:00Z")));
    }
    @Test public void missingValuesAreNotZeroGoals() throws Exception {
        List<Fixture> f=Fixture.parse("{\"games\":[{\"id\":\"a\",\"home\":\"Kadetten Schaffhausen\",\"away\":\"Gast\",\"league\":\"QHL\",\"date\":\"2026-10-03\"}]}");assertFalse(f.get(0).ended());
    }
    @Test(expected=IllegalArgumentException.class) public void invalidScoreRejected() throws Exception {
        Fixture.parse("{\"games\":[{\"id\":\"a\",\"home\":\"Kadetten Schaffhausen\",\"away\":\"Gast\",\"league\":\"QHL\",\"date\":\"2026-10-03\",\"score\":[null,2]}]}");
    }
}
