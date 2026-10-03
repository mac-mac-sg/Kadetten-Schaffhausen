package ch.raith.kadetten.widget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

public final class MatchWorker extends Worker {
    public MatchWorker(@NonNull Context c,@NonNull WorkerParameters p) { super(c,p); }
    @NonNull @Override public Result doWork() {
        if(MatchWidget.ids(getApplicationContext()).length==0)return Result.success();
        WidgetRepository.refresh(getApplicationContext());
        MatchWidget.renderAll(getApplicationContext());
        return Result.success();
    }
    static void schedule(Context c) {
        Constraints constraints=new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest periodic=new PeriodicWorkRequest.Builder(MatchWorker.class,30,TimeUnit.MINUTES).setConstraints(constraints).build();
        WorkManager.getInstance(c).enqueueUniquePeriodicWork("kadetten-periodic",ExistingPeriodicWorkPolicy.KEEP,periodic);
    }
    static void now(Context c) {
        if(MatchWidget.ids(c).length==0)return;
        WidgetRepository.prefs(c).edit().putBoolean("refreshing",true).apply();
        MatchWidget.renderAll(c);
        WorkManager.getInstance(c).enqueueUniqueWork("kadetten-manual",ExistingWorkPolicy.KEEP,new OneTimeWorkRequest.Builder(MatchWorker.class).build());
    }
    static void stop(Context c) {
        WorkManager.getInstance(c).cancelUniqueWork("kadetten-periodic");
        WorkManager.getInstance(c).cancelUniqueWork("kadetten-manual");
    }
}
