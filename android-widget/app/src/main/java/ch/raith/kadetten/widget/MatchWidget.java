package ch.raith.kadetten.widget;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

public final class MatchWidget extends AppWidgetProvider {
    private static final String REFRESH = "ch.raith.kadetten.widget.REFRESH";

    static int[] ids(Context context) {
        return AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, MatchWidget.class));
    }

    @Override public void onEnabled(Context context) { MatchWorker.schedule(context); }
    @Override public void onDisabled(Context context) { MatchWorker.stop(context); }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        renderAll(context);
        MatchWorker.schedule(context);
        MatchWorker.now(context);
    }

    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        renderAll(context);
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (REFRESH.equals(intent.getAction())) MatchWorker.now(context);
    }

    static void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        Instant now = Instant.now();
        List<Fixture> fixtures = WidgetRepository.fixtures(context);
        Fixture fixture = Fixture.choose(fixtures, now);
        Fixture last = Fixture.lastResult(fixtures, now);
        SharedPreferences preferences = WidgetRepository.prefs(context);
        long checked = preferences.getLong("checked", 0);
        boolean failed = preferences.getBoolean("failed", false);
        boolean today = fixture != null && fixture.date.equals(now.atZone(Fixture.ZURICH).toLocalDate());

        for (int id : ids(context)) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.match_widget);
            views.setInt(R.id.widget_root, "setBackgroundResource", today ? R.drawable.widget_matchday : R.drawable.widget_preview);
            String url = WidgetRepository.WEB;
            if (fixture != null) {
                String heading = fixture.ended() ? "ENDRESULTAT" : today ? "HEUTE · KADETTEN" : "NÄCHSTES SPIEL";
                String middle = fixture.ended() ? fixture.homeScore + ":" + fixture.awayScore : fixture.time.isEmpty() ? "–" : fixture.time;
                String label = fixture.ended() ? "Bestätigt" : fixture.time.isEmpty() ? "Zeit offen" : "Anpfiff";
                boolean started = !fixture.ended() && !fixture.time.isEmpty() && fixture.kickoff().toInstant().isBefore(now);
                if (started) label = "Zur Spielseite";
                views.setTextViewText(R.id.heading, heading);
                views.setTextViewText(R.id.league, fixture.league.replace("Mobiliar-Cup M", "Cup"));
                views.setTextViewText(R.id.home_name, Fixture.shortName(fixture.home));
                views.setTextViewText(R.id.away_name, Fixture.shortName(fixture.away));
                views.setTextViewText(R.id.score, middle);
                views.setTextViewText(R.id.score_label, label);
                views.setTextViewText(R.id.date, fixture.dateLine());
                setLogo(context, views, R.id.home_logo, fixture.home);
                setLogo(context, views, R.id.away_logo, fixture.away);
                url += "#/spiel/" + Uri.encode(fixture.id);
                views.setContentDescription(R.id.widget_root, fixture.home + " gegen " + fixture.away + ", "
                        + middle + ", " + label + ", " + fixture.dateLine() + ". Spielseite öffnen");
            } else {
                views.setTextViewText(R.id.heading, "KADETTEN");
                views.setTextViewText(R.id.score_label, "Spielplan");
                views.setTextViewText(R.id.date, failed ? "Abruf fehlgeschlagen · erneut laden" : "Kein Spiel verfügbar");
            }

            boolean showLast = last != null && fixture != null && !last.id.equals(fixture.id);
            Bundle options = manager.getAppWidgetOptions(id);
            boolean tall = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 170) >= 200;
            views.setViewVisibility(R.id.last_result, showLast && tall ? View.VISIBLE : View.GONE);
            if (showLast) {
                views.setTextViewText(R.id.last_result, "Zuletzt · " + last.resultLine());
                Intent openLast = new Intent(Intent.ACTION_VIEW, Uri.parse(WidgetRepository.WEB + "#/spiel/" + Uri.encode(last.id)));
                views.setOnClickPendingIntent(R.id.last_result,
                        PendingIntent.getActivity(context, id, openLast, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            String stamp = checked == 0 ? "Noch kein Datenstand" : "Stand " + Instant.ofEpochMilli(checked).atZone(Fixture.ZURICH)
                    .format(DateTimeFormatter.ofPattern("dd.MM. HH:mm"));
            boolean old = checked > 0 && now.toEpochMilli() - checked > 12 * 60 * 60 * 1000L;
            String status = preferences.getBoolean("refreshing", false) ? "Wird aktualisiert …" : failed ? "Offline · " + stamp
                    : old ? "Verzögert · " + stamp : stamp;
            views.setTextViewText(R.id.status, status);
            Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            views.setOnClickPendingIntent(R.id.widget_root,
                    PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            Intent refresh = new Intent(context, MatchWidget.class).setAction(REFRESH);
            views.setOnClickPendingIntent(R.id.refresh,
                    PendingIntent.getBroadcast(context, id, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            manager.updateAppWidget(id, views);
        }
    }

    private static void setLogo(Context context, RemoteViews views, int view, String team) {
        if (Fixture.isKadetten(team)) {
            views.setImageViewResource(view, R.drawable.kadetten_crest);
            return;
        }
        Bitmap bitmap = WidgetRepository.logo(context, team);
        if (bitmap != null) views.setImageViewBitmap(view, bitmap);
        else views.setImageViewResource(view, R.drawable.ic_shield);
    }
}
