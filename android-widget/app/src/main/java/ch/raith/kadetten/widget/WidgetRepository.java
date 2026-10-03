package ch.raith.kadetten.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

final class WidgetRepository {
    static final String WEB="https://mac-mac-sg.github.io/Kadetten-Schaffhausen/";
    static final String API="https://kadetten.ma-ra10.chatgpt.site/api/data";
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("widget_data",Context.MODE_PRIVATE); }
    static synchronized boolean refresh(Context c) {
        SharedPreferences p=prefs(c);
        try {
            String body=new String(download(API,2_000_000),StandardCharsets.UTF_8);
            Fixture.parse(body); // Erst vollständig prüfen, dann den letzten gültigen Stand ersetzen.
            p.edit().putString("snapshot",body).putLong("loaded",System.currentTimeMillis()).putBoolean("failed",false).putBoolean("refreshing",false).apply();
            cacheLogos(c,body);
            return true;
        } catch(Exception e) { p.edit().putBoolean("failed",true).putBoolean("refreshing",false).apply(); return false; }
    }
    static byte[] download(String address,int limit) throws IOException {
        HttpURLConnection connection=(HttpURLConnection)new URL(address).openConnection();
        connection.setConnectTimeout(12000); connection.setReadTimeout(12000); connection.setInstanceFollowRedirects(false);
        connection.setRequestMethod("GET"); connection.setRequestProperty("User-Agent","Mozilla/5.0 KadettenWidget/0.1");
        // Derselbe öffentliche Read-Origin wie die Pages-App, keine Identität oder Cookies.
        connection.setRequestProperty("Origin","https://mac-mac-sg.github.io");
        try {
            if(connection.getResponseCode()!=200) throw new IOException("Public data unavailable");
            try(InputStream stream=connection.getInputStream(); ByteArrayOutputStream output=new ByteArrayOutputStream()) {
                byte[] buffer=new byte[8192]; int count;
                while((count=stream.read(buffer))!=-1) { if(output.size()+count>limit)throw new IOException("Response too large"); output.write(buffer,0,count); }
                return output.toByteArray();
            }
        } finally { connection.disconnect(); }
    }
    static Fixture selected(Context c) {
        try { return Fixture.choose(Fixture.parse(prefs(c).getString("snapshot","")),Instant.now()); }
        catch(Exception e) { return null; }
    }
    private static File logoFile(Context c,String team) { return new File(c.getCacheDir(),"logo-"+Integer.toHexString(team.hashCode())+".png"); }
    static Bitmap logo(Context c,String team) { return BitmapFactory.decodeFile(logoFile(c,team).getAbsolutePath()); }
    private static void cacheLogos(Context c,String body) {
        try {
            List<Fixture> fixtures=Fixture.parse(body); Fixture f=Fixture.choose(fixtures,Instant.now());
            if(f==null)return;
            JSONObject logos=new JSONObject(body).optJSONObject("clubLogos"); if(logos==null)return;
            for(String team:new String[]{f.home,f.away}) {
                File file=logoFile(c,team); if(file.exists())continue;
                String path=logos.optString(team,"").replaceAll("\\.(png|jpe?g)$",".webp");
                if(!path.matches("assets/club-[0-9]+\\.webp"))continue;
                try {
                    byte[] data=download(WEB+path,2_000_000);
                    BitmapFactory.Options bounds=new BitmapFactory.Options(); bounds.inJustDecodeBounds=true;
                    BitmapFactory.decodeByteArray(data,0,data.length,bounds);
                    if(bounds.outWidth<=0 || bounds.outHeight<=0 || bounds.outWidth>4096 || bounds.outHeight>4096)continue;
                    BitmapFactory.Options options=new BitmapFactory.Options(); options.inSampleSize=Math.max(1,Math.max(bounds.outWidth,bounds.outHeight)/128);
                    Bitmap bitmap=BitmapFactory.decodeByteArray(data,0,data.length,options); if(bitmap==null)continue;
                    try(FileOutputStream stream=new FileOutputStream(file)) { bitmap.compress(Bitmap.CompressFormat.PNG,100,stream); }
                    bitmap.recycle();
                }catch(Exception ignored) { /* Das Spiel bleibt auch ohne Logo nutzbar. */ }
            }
        }catch(Exception ignored) { }
    }
}
