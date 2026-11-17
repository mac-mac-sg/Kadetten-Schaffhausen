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
import java.util.Collections;
import java.util.List;

final class WidgetRepository {
    static final String WEB = "https://mac-mac-sg.github.io/Kadetten-Schaffhausen/";
    static final String API = "https://kadetten-api.mac-mac-sg.workers.dev/api/data";

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
    }

    static synchronized boolean refresh(Context context) {
        SharedPreferences preferences = prefs(context);
        try {
            String body = new String(download(API, 2_000_000), StandardCharsets.UTF_8);
            Fixture.parse(body);
            long checkedAt = Instant.parse(new JSONObject(body).getString("checkedAt")).toEpochMilli();
            if (checkedAt > System.currentTimeMillis() + 300_000) throw new IOException("Invalid snapshot time");
            preferences.edit().putString("snapshot", body).putLong("checked", checkedAt)
                    .putBoolean("failed", false).putBoolean("refreshing", false).apply();
            cacheLogos(context, body);
            return true;
        } catch (Exception error) {
            preferences.edit().putBoolean("failed", true).putBoolean("refreshing", false).apply();
            return false;
        }
    }

    static byte[] download(String address, int limit) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(12000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("User-Agent", "KadettenWidget/0.2");
        connection.setRequestProperty("Origin", "https://mac-mac-sg.github.io");
        try {
            if (connection.getResponseCode() != 200) throw new IOException("Public data unavailable");
            try (InputStream stream = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = stream.read(buffer)) != -1) {
                    if (output.size() + count > limit) throw new IOException("Response too large");
                    output.write(buffer, 0, count);
                }
                return output.toByteArray();
            }
        } finally {
            connection.disconnect();
        }
    }

    static List<Fixture> fixtures(Context context) {
        try {
            return Fixture.parse(prefs(context).getString("snapshot", ""));
        } catch (Exception error) {
            return Collections.emptyList();
        }
    }

    private static File logoFile(Context context, String team) {
        return new File(context.getCacheDir(), "logo-" + Integer.toHexString(team.hashCode()) + ".png");
    }

    static Bitmap logo(Context context, String team) {
        return BitmapFactory.decodeFile(logoFile(context, team).getAbsolutePath());
    }

    private static void cacheLogos(Context context, String body) {
        try {
            Fixture fixture = Fixture.choose(Fixture.parse(body), Instant.now());
            JSONObject logos = new JSONObject(body).optJSONObject("clubLogos");
            if (fixture == null || logos == null) return;
            for (String team : new String[]{fixture.home, fixture.away}) {
                if (Fixture.isKadetten(team)) continue;
                File file = logoFile(context, team);
                if (file.exists()) continue;
                String path = Fixture.logoPath(logos.optString(team, ""));
                if (path == null) continue;
                try {
                    byte[] data = download(WEB + path, 2_000_000);
                    BitmapFactory.Options bounds = new BitmapFactory.Options();
                    bounds.inJustDecodeBounds = true;
                    BitmapFactory.decodeByteArray(data, 0, data.length, bounds);
                    if (bounds.outWidth <= 0 || bounds.outHeight <= 0 || bounds.outWidth > 4096 || bounds.outHeight > 4096)
                        continue;
                    BitmapFactory.Options options = new BitmapFactory.Options();
                    options.inSampleSize = Math.max(1, Math.max(bounds.outWidth, bounds.outHeight) / 128);
                    Bitmap bitmap = BitmapFactory.decodeByteArray(data, 0, data.length, options);
                    if (bitmap == null) continue;
                    File temporary = new File(file.getPath() + ".tmp");
                    try (FileOutputStream stream = new FileOutputStream(temporary)) {
                        if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) throw new IOException("Logo encoding failed");
                    } finally {
                        bitmap.recycle();
                    }
                    if (!temporary.renameTo(file)) temporary.delete();
                } catch (Exception ignored) {
                    // Die Paarung bleibt auch bei einem fehlenden Gegnerwappen verfügbar.
                }
            }
        } catch (Exception ignored) {
            // Ein optionales Wappen ersetzt niemals den gültigen Spielplan.
        }
    }
}
