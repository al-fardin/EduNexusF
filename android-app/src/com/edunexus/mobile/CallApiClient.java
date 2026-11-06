package com.edunexus.mobile;

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** A bounded authenticated request. Each request owns an immutable call snapshot. */
final class CallApiClient {
  private CallApiClient() {}

  static final class AuthorizationExpired extends Exception {}

  static String post(String origin, String call, String session, String access, String action)
      throws Exception {
    HttpURLConnection connection =
        (HttpURLConnection)
            new URL(origin + "/api/calling/" + call + "/action?session=" + session)
                .openConnection();
    try {
      connection.setInstanceFollowRedirects(false);
      connection.setConnectTimeout(5000);
      connection.setReadTimeout(5000);
      connection.setRequestMethod("POST");
      connection.setRequestProperty("Authorization", "Bearer " + access);
      connection.setRequestProperty("Content-Type", "application/json");
      connection.setDoOutput(true);
      try (java.io.OutputStream out = connection.getOutputStream()) {
        out.write(("{\"action\":\"" + action + "\"}").getBytes(StandardCharsets.UTF_8));
      }
      int status = connection.getResponseCode();
      if (status == 401 || status == 403) throw new AuthorizationExpired();
      if (status < 200 || status >= 300) throw new java.io.IOException("Call unavailable");
      try (java.io.InputStream in = connection.getInputStream()) {
        java.io.ByteArrayOutputStream result = new java.io.ByteArrayOutputStream();
        byte[] bytes = new byte[512];
        int length;
        while ((length = in.read(bytes)) != -1) {
          if (result.size() + length > 4096) throw new java.io.IOException("Invalid call response");
          result.write(bytes, 0, length);
        }
        return result.toString("UTF-8");
      }
    } finally {
      connection.disconnect();
    }
  }
}
