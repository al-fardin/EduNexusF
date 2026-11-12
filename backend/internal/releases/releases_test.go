package releases

import (
	"strings"
	"testing"
)

func TestReleaseDownloadBoundary(t *testing.T) {
	m := Manifest{Code: 3, Name: "1.2.0", URL: "/downloads/EduNexus-release.apk", SHA256: strings.Repeat("a", 64)}
	if !valid(m) {
		t.Fatal("valid release rejected")
	}
	for _, path := range []string{"https://evil.test/app.apk", "//evil.test/app.apk", "/downloads/../evil.apk"} {
		m.URL = path
		if valid(m) {
			t.Fatal("unsafe download", path)
		}
	}
}

func TestNewReleasesRequireBoundedIntegrityMetadata(t *testing.T) {
	m := Manifest{Code: 6, Name: "1.4.0", URL: "/downloads/EduNexus-release.apk", SHA256: strings.Repeat("a", 64)}
	if valid(m) {
		t.Fatal("new release accepted without integrity metadata")
	}
	m.Certificate = strings.Repeat("b", 64)
	m.Size = 1024
	if !valid(m) {
		t.Fatal("valid new release rejected")
	}
	m.Size = 101 * 1024 * 1024
	if valid(m) {
		t.Fatal("oversized APK accepted")
	}
}
