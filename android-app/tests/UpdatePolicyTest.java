package com.edunexus.mobile;

public final class UpdatePolicyTest {
  private static void check(boolean value) {
    if (!value) throw new AssertionError("Update boundary failed");
  }

  public static void main(String[] args) {
    String a = new String(new char[64]).replace('\0', 'a'),
        b = new String(new char[64]).replace('\0', 'b');
    check(UpdatePolicy.validManifest(5, 6, a, a, 100));
    check(!UpdatePolicy.validManifest(6, 6, a, a, 100));
    check(!UpdatePolicy.validManifest(7, 6, a, a, 100));
    check(!UpdatePolicy.validManifest(5, 6, a, a, UpdatePolicy.MAX_APK_BYTES + 1));
    check(!UpdatePolicy.validManifest(5, 6, "invalid", a, 100));
    check(!UpdatePolicy.validManifest(5, 6, a, null, 100));
    check(
        UpdatePolicy.validArchive("com.edunexus.mobile", "com.edunexus.mobile", 5, 6, 6, a, a, a));
    check(!UpdatePolicy.validArchive("com.edunexus.mobile", "other.package", 5, 6, 6, a, a, a));
    check(
        !UpdatePolicy.validArchive("com.edunexus.mobile", "com.edunexus.mobile", 5, 6, 7, a, a, a));
    check(
        !UpdatePolicy.validArchive("com.edunexus.mobile", "com.edunexus.mobile", 5, 6, 6, a, b, a));
    check(!UpdatePolicy.sameHash(a, b));
    System.out.println("Android update package/version/hash/signing boundaries passed");
  }
}
