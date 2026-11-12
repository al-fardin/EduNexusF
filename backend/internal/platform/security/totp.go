package security

import (
	"crypto/hmac"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/binary"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// TOTP follows RFC 6238, SHA-1, six digits, a 30-second time step.
func TOTP(secret []byte, step int64) string {
	var counter [8]byte
	binary.BigEndian.PutUint64(counter[:], uint64(step))
	mac := hmac.New(sha1.New, secret)
	mac.Write(counter[:])
	sum := mac.Sum(nil)
	o := sum[len(sum)-1] & 15
	n := binary.BigEndian.Uint32(sum[o:o+4]) & 0x7fffffff
	return fmt.Sprintf("%06d", n%1000000)
}
func CheckTOTP(secret []byte, code string, last int64, now time.Time) (int64, bool) {
	if len(code) != 6 || strings.Trim(code, "0123456789") != "" {
		return -1, false
	}
	if _, e := strconv.Atoi(code); e != nil {
		return -1, false
	}
	step := now.Unix() / 30
	for _, s := range []int64{step, step - 1, step + 1} {
		if s > last && subtle.ConstantTimeCompare([]byte(TOTP(secret, s)), []byte(code)) == 1 {
			return s, true
		}
	}
	return -1, false
}
