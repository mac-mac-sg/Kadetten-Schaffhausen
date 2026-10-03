package ch.raith.kadetten.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.widget.*;
import android.graphics.Color;

public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);
        int pad=(int)(24*getResources().getDisplayMetrics().density);layout.setPadding(pad,pad*3,pad,pad);
        layout.setBackgroundColor(Color.rgb(17,19,16));
        TextView title=new TextView(this);title.setText("Orange auf deinem Homescreen.");title.setTextSize(30);title.setTextColor(Color.rgb(255,121,0));layout.addView(title);
        TextView info=new TextView(this);info.setText("Dein Kadetten-Spieltag als Widget.\n\nVorschau, Matchday und bestätigte Resultate – mit denselben öffentlichen Daten wie die Web-App.\n\nAktualisierung etwa alle 30 Minuten, abhängig von Androids Energiesparfunktionen. Das Refresh-Symbol lädt auf Wunsch neu.\n\nAlternativ: Homescreen lange drücken → Widgets → Kadetten Widget.\n");info.setTextSize(16);info.setTextColor(Color.rgb(250,245,233));layout.addView(info);
        Button pin=new Button(this);pin.setText("Widget hinzufügen");pin.setOnClickListener(v->{
            AppWidgetManager manager=AppWidgetManager.getInstance(this);
            if(manager.isRequestPinAppWidgetSupported())manager.requestPinAppWidget(new ComponentName(this,MatchWidget.class),null,null);
            else Toast.makeText(this,"Homescreen lange drücken → Widgets → Kadetten Widget",Toast.LENGTH_LONG).show();
        });layout.addView(pin);
        Button web=new Button(this);web.setText("Kadetten-App öffnen");web.setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(WidgetRepository.WEB))));layout.addView(web);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(layout);setContentView(scroll);
        if(MatchWidget.ids(this).length>0){MatchWorker.schedule(this);MatchWorker.now(this);}
    }
}
