package com.edunexus.mobile;

import android.util.Log;

/** Reports failure categories without logging tokens, URLs or message contents. */
final class AppDiagnostics {
  private AppDiagnostics() {}

  static void warn(String operation, Exception error) {
    Log.w("EduNexus", operation + " (" + error.getClass().getSimpleName() + ")");
  }
}
