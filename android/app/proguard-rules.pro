# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Capacitor (#89) -----------------------------------------------------------
# R8 is enabled (minifyEnabled/shrinkResources in build.gradle). Capacitor finds
# its plugins by reflection from capacitor.plugins.json, so the framework and every
# Plugin subclass must be kept or the bridge fails to load at runtime. These mirror
# the rules Capacitor documents for release builds; they also cover the built-in
# SystemBars plugin used for full screen and safe areas.
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }

# @JavascriptInterface methods are called from the WebView by name.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
