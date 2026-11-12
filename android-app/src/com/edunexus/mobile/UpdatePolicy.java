package com.edunexus.mobile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Pure validation shared by the download and installer boundary. */
public final class UpdatePolicy {
  public static final long MAX_APK_BYTES = 100L * 1024 * 1024;

  private UpdatePolicy() {}

  public static boolean validManifest(
      long installed, long offered, String hash, String certificate, long size) {
    return offered > installed
        && offered <= Integer.MAX_VALUE
        && validHash(hash)
        && validHash(certificate)
        && size > 0
        && size <= MAX_APK_BYTES;
  }

  public static boolean validHash(String value) {
    return value != null && value.matches("[a-f0-9]{64}");
  }

  public static boolean sameHash(String a, String b) {
    return validHash(a)
        && validHash(b)
        && MessageDigest.isEqual(
            a.getBytes(StandardCharsets.US_ASCII), b.getBytes(StandardCharsets.US_ASCII));
  }

  public static boolean validArchive(
      String installedPackage,
      String archivePackage,
      long installed,
      long offered,
      long archive,
      String expectedCertificate,
      String installedCertificate,
      String archiveCertificate) {
    return installedPackage != null
        && installedPackage.equals(archivePackage)
        && archive == offered
        && offered > installed
        && sameHash(expectedCertificate, archiveCertificate)
        && sameHash(installedCertificate, archiveCertificate);
  }
}
