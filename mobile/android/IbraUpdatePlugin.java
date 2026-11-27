package com.ibraprogram.ibratank;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// التحديث الداخلي: ينزّل APK الجديد ويفتح شاشة التثبيت
@CapacitorPlugin(name = "IbraUpdate")
public class IbraUpdatePlugin extends Plugin {

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    @PluginMethod
    public void install(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) { call.reject("bad url"); return; }
        if (!canInstall()) {
            // أول مرة: يطلب السماح بتثبيت التطبيقات من هاللعبة
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(s);
            JSObject r = new JSObject(); r.put("needPermission", true); call.resolve(r);
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "update");
                dir.mkdirs();
                File f = new File(dir, "update.apk");
                String u = url; HttpURLConnection c = null;
                for (int i = 0; i < 6; i++) { // يتبع التحويلات
                    c = (HttpURLConnection) new URL(u).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(15000); c.setReadTimeout(30000);
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) { u = c.getHeaderField("Location"); c.disconnect(); continue; }
                    if (code != 200) throw new Exception("http " + code);
                    break;
                }
                long total = c.getContentLengthLong(), got = 0, last = 0;
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(f)) {
                    byte[] buf = new byte[64 * 1024]; int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n); got += n;
                        long now = System.currentTimeMillis();
                        if (now - last > 150) { last = now; JSObject p = new JSObject(); p.put("p", total > 0 ? (double) got / total : -1); notifyListeners("progress", p); }
                    }
                }
                if (total > 0 && got < total) throw new Exception("incomplete");
                JSObject p = new JSObject(); p.put("p", 1); notifyListeners("progress", p);
                Uri apk = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".ibraupdate", f);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(apk, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                JSObject r = new JSObject(); r.put("started", true); call.resolve(r);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        }).start();
    }
}
