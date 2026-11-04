package releases

import (
	"strings"
	"testing"
)

func TestReleaseDownloadBoundary(t *testing.T) {
	m := Manifest{3, "1.2.0", "/downloads/EduNexus-release.apk", strings.Repeat("a", 64), ""}
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
