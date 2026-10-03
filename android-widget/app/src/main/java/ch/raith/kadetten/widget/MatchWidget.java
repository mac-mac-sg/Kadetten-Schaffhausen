package ch.raith.kadetten.widget;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;
import java.time.*;
import java.time.format.DateTimeFormatter;

public final class MatchWidget extends AppWidgetProvider {
    private static final String REFRESH="ch.raith.kadetten.widget.REFRESH";
    static int[] ids(Context c) { return AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,MatchWidget.class)); }
    @Override public void onEnabled(Context c) { MatchWorker.schedule(c); }
    @Override public void onDisabled(Context c) { MatchWorker.stop(c); }
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids) { renderAll(c); MatchWorker.schedule(c); MatchWorker.now(c); }
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options) { renderAll(c); }
    @Override public void onReceive(Context c,Intent intent) {
        super.onReceive(c,intent);
        if(REFRESH.equals(intent.getAction())) {
            MatchWorker.now(c);
            renderAll(c);
        }
    }
    static void renderAll(Context c) {
        AppWidgetManager manager=AppWidgetManager.getInstance(c);
        Fixture f=WidgetRepository.selected(c);
        boolean today=f!=null && f.date.equals(LocalDate.now(Fixture.ZURICH));
        long loaded=WidgetRepository.prefs(c).getLong("loaded",0);
        boolean failed=WidgetRepository.prefs(c).getBoolean("failed",false);
        for(int id:ids(c)) {
            RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.match_widget);
            v.setInt(R.id.widget_root,"setBackgroundResource",today?R.drawable.widget_matchday:R.drawable.widget_preview);
            String url=WidgetRepository.WEB;
            if(f!=null) {
                v.setTextViewText(R.id.heading,f.ended()?"HEUTE GESPIELT":today?"MATCHDAY":"NÄCHSTES SPIEL");
                v.setTextViewText(R.id.league,f.league);
                v.setTextViewText(R.id.home_name,f.home); v.setTextViewText(R.id.away_name,f.away);
                v.setTextViewText(R.id.score,f.ended()?f.homeScore+" : "+f.awayScore:"VS");
                v.setTextViewText(R.id.date,f.dateLine());
                setLogo(c,v,R.id.home_logo,f.home);setLogo(c,v,R.id.away_logo,f.away);
                url+="#match/"+Uri.encode(f.id)+"/overview";
                v.setContentDescription(R.id.widget_root,f.home+" gegen "+f.away+" · "+f.dateLine()+" · Spielseite öffnen");
            } else {
                v.setTextViewText(R.id.heading,"KADETTEN");v.setTextViewText(R.id.home_name,"Kadetten");v.setTextViewText(R.id.away_name,"");
                v.setTextViewText(R.id.score,"–");v.setTextViewText(R.id.date,loaded==0?"Daten werden geladen …":"Kein nächstes Spiel verfügbar");
            }
            String stamp=loaded==0?"Noch kein Datenstand": "Stand "+Instant.ofEpochMilli(loaded).atZone(Fixture.ZURICH).format(DateTimeFormatter.ofPattern("dd.MM. HH:mm"));
            v.setTextViewText(R.id.status,(WidgetRepository.prefs(c).getBoolean("refreshing",false)?"Aktualisierung … · ":"")+(failed?"Offline / letzter Stand · ":"")+stamp+(f!=null && today && !f.ended() && !f.time.isEmpty() && f.kickoff().toInstant().isBefore(Instant.now())?" · Liveticker in der App":""));
            Intent open=new Intent(Intent.ACTION_VIEW,Uri.parse(url));
            v.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
            Intent refresh=new Intent(c,MatchWidget.class).setAction(REFRESH);
            v.setOnClickPendingIntent(R.id.refresh,PendingIntent.getBroadcast(c,id,refresh,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
            manager.updateAppWidget(id,v);
        }
    }
    private static void setLogo(Context c,RemoteViews v,int view,String team) {
        Bitmap bitmap=WidgetRepository.logo(c,team);
        if(bitmap!=null)v.setImageViewBitmap(view,bitmap);
        else v.setImageViewResource(view,R.drawable.ic_shield);
    }
}
