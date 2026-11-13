package service

import "testing"

func TestVerificationPageUsesPublicOrigin(t *testing.T) {
	for _, tc := range []struct{ origin, want string }{
		{"", "http://localhost:3000/verify-email"},
		{"https://learn.example/", "https://learn.example/verify-email"},
		{"http://127.0.0.1:3007", "http://127.0.0.1:3007/verify-email"},
		{"http://learn.example", ""},
		{"https://user:pass@learn.example", ""},
		{"https://learn.example/path", ""},
		{"https://learn.example/?next=elsewhere", ""},
		{"https://learn.example/#fragment", ""},
		{"javascript:alert(1)", ""},
	} {
		t.Run(tc.origin, func(t *testing.T) {
			t.Setenv("FRONTEND_URL", tc.origin)
			page, err := verificationPage()
			if tc.want == "" {
				if err == nil {
					t.Fatal("invalid origin accepted")
				}
				return
			}
			if err != nil || page.String() != tc.want {
				t.Fatalf("page=%v err=%v", page, err)
			}
		})
	}
}
