package security

import (
	"testing"
	"time"
)

func TestTOTPRFC6238VectorsAndReplay(t *testing.T) {
	secret := []byte("12345678901234567890")
	for _, v := range []struct {
		at   int64
		code string
	}{{59, "287082"}, {1111111109, "081804"}, {1111111111, "050471"}, {1234567890, "005924"}, {2000000000, "279037"}, {20000000000, "353130"}} {
		if got := TOTP(secret, v.at/30); got != v.code {
			t.Errorf("RFC vector %d failed", v.at)
		}
		step, ok := CheckTOTP(secret, v.code, -1, time.Unix(v.at, 0))
		if !ok {
			t.Fatal("valid factor rejected")
		}
		if _, ok = CheckTOTP(secret, v.code, step, time.Unix(v.at, 0)); ok {
			t.Fatal("factor replay accepted")
		}
	}
	for _, bad := range []string{"", "00000", "12345x", " 287082", "2870820"} {
		if _, ok := CheckTOTP(secret, bad, -1, time.Unix(59, 0)); ok {
			t.Fatal("malformed factor accepted")
		}
	}
}
