package notifications

import (
	"bytes"
	"context"
	"crypto/elliptic"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/golang-jwt/jwt/v5"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type PushPayload struct {
	User  string `json:"user_id"`
	ID    string `json:"notification_id"`
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url"`
}
type pushDevice struct {
	ID, User, Platform, Token, Binding string
	Subscription                       []byte
}
type pushSender struct {
	client                         *http.Client
	webPublic, webPrivate, subject string
	firebaseProject, email         string
	key                            *rsa.PrivateKey
	tokenURL, fcmURL               string
	mu                             sync.Mutex
	access                         string
	expires                        time.Time
}

func newPushSender() *pushSender {
	s := &pushSender{client: &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, subject: os.Getenv("VAPID_SUBJECT"), tokenURL: "https://oauth2.googleapis.com/token", fcmURL: "https://fcm.googleapis.com/v1/projects/"}
	s.webPublic = os.Getenv("VAPID_PUBLIC_KEY")
	s.webPrivate = os.Getenv("VAPID_PRIVATE_KEY")
	private, e1 := base64.RawURLEncoding.DecodeString(s.webPrivate)
	public, e2 := base64.RawURLEncoding.DecodeString(s.webPublic)
	if e1 != nil || e2 != nil || len(private) != 32 || len(public) != 65 {
		s.webPublic = ""
		s.webPrivate = ""
	} else {
		x, y := elliptic.P256().ScalarBaseMult(private)
		if !bytes.Equal(elliptic.Marshal(elliptic.P256(), x, y), public) {
			s.webPublic = ""
			s.webPrivate = ""
		}
	}
	subject, err := url.Parse(s.subject)
	if err != nil || (subject.Scheme != "mailto" && subject.Scheme != "https") {
		s.webPublic = ""
		s.webPrivate = ""
	}
	if path := os.Getenv("FIREBASE_SERVICE_ACCOUNT_FILE"); path != "" {
		raw, e := os.ReadFile(path)
		var account struct {
			Project string `json:"project_id"`
			Email   string `json:"client_email"`
			Key     string `json:"private_key"`
		}
		if e == nil && len(raw) < 65536 && json.Unmarshal(raw, &account) == nil && account.Project != "" && account.Email != "" {
			block, _ := pem.Decode([]byte(account.Key))
			if block != nil {
				key, e := x509.ParsePKCS8PrivateKey(block.Bytes)
				if e == nil {
					if rsaKey, ok := key.(*rsa.PrivateKey); ok {
						s.key = rsaKey
						s.firebaseProject = account.Project
						s.email = account.Email
					}
				}
			}
		}
	}
	return s
}
func (s *pushSender) webConfigured() bool     { return s.webPublic != "" && s.webPrivate != "" }
func (s *pushSender) androidConfigured() bool { return s.key != nil && s.firebaseProject != "" }
func validPushEndpoint(raw string) bool {
	u, e := url.Parse(raw)
	if e != nil || u.Scheme != "https" || u.User != nil || u.Fragment != "" || u.Port() != "" {
		return false
	}
	host := strings.ToLower(u.Hostname())
	return host == "fcm.googleapis.com" || host == "updates.push.services.mozilla.com" || strings.HasSuffix(host, ".push.services.mozilla.com") || host == "web.push.apple.com" || strings.HasSuffix(host, ".notify.windows.com")
}
func validateSubscription(raw []byte) error {
	var sub webpush.Subscription
	if json.Unmarshal(raw, &sub) != nil || !validPushEndpoint(sub.Endpoint) {
		return errors.New("unsupported push subscription")
	}
	key, e := base64.RawURLEncoding.DecodeString(sub.Keys.P256dh)
	if e != nil {
		return errors.New("invalid subscription key")
	}
	x, y := elliptic.Unmarshal(elliptic.P256(), key)
	if x == nil || y == nil {
		return errors.New("invalid subscription key")
	}
	auth, e := base64.RawURLEncoding.DecodeString(sub.Keys.Auth)
	if e != nil || len(auth) != 16 {
		return errors.New("invalid subscription authentication")
	}
	return nil
}
func (s *pushSender) oauth(ctx context.Context) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.access != "" && time.Until(s.expires) > time.Minute {
		return s.access, nil
	}
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{"iss": s.email, "scope": "https://www.googleapis.com/auth/firebase.messaging", "aud": s.tokenURL, "iat": now.Unix(), "exp": now.Add(time.Hour).Unix()})
	signed, err := token.SignedString(s.key)
	if err != nil {
		return "", err
	}
	values := url.Values{"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"}, "assertion": {signed}}
	req, err := http.NewRequestWithContext(ctx, "POST", s.tokenURL, strings.NewReader(values.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return "", errors.New("push credentials rejected")
	}
	var out struct {
		Access  string `json:"access_token"`
		Expires int    `json:"expires_in"`
	}
	if json.NewDecoder(io.LimitReader(res.Body, 16384)).Decode(&out) != nil || out.Access == "" {
		return "", errors.New("invalid push credential response")
	}
	s.access = out.Access
	s.expires = now.Add(time.Duration(min(max(out.Expires, 60), 3600)) * time.Second)
	return s.access, nil
}
func (s *pushSender) send(ctx context.Context, d pushDevice, p PushPayload) (bool, error) {
	payload, err := json.Marshal(p)
	if err != nil {
		return false, err
	}
	if d.Platform == "web" {
		if !s.webConfigured() {
			return false, errors.New("browser push is not configured")
		}
		var sub webpush.Subscription
		if err = json.Unmarshal(d.Subscription, &sub); err != nil {
			return true, nil
		}
		if !validPushEndpoint(sub.Endpoint) {
			return true, nil
		}
		response, e := webpush.SendNotificationWithContext(ctx, payload, &sub, &webpush.Options{HTTPClient: s.client, Subscriber: s.subject, VAPIDPublicKey: s.webPublic, VAPIDPrivateKey: s.webPrivate, TTL: 3600, Urgency: webpush.UrgencyNormal})
		if e != nil {
			return false, e
		}
		defer response.Body.Close()
		io.Copy(io.Discard, io.LimitReader(response.Body, 16384))
		if response.StatusCode == 404 || response.StatusCode == 410 {
			return true, nil
		}
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			return false, errors.New("browser push deferred")
		}
		return false, nil
	}
	if !s.androidConfigured() {
		return false, errors.New("android push is not configured")
	}
	token, e := s.oauth(ctx)
	if e != nil {
		return false, e
	}
	body, _ := json.Marshal(map[string]any{"message": map[string]any{"token": d.Token, "data": map[string]string{"user_id": p.User, "notification_id": p.ID, "title": p.Title, "body": p.Body, "url": p.URL}, "android": map[string]any{"priority": "high", "ttl": "3600s"}}})
	req, e := http.NewRequestWithContext(ctx, "POST", s.fcmURL+url.PathEscape(s.firebaseProject)+"/messages:send", bytes.NewReader(body))
	if e != nil {
		return false, e
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res, e := s.client.Do(req)
	if e != nil {
		return false, e
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 32768))
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return false, nil
	}
	var failure struct {
		Error struct {
			Details []struct {
				Code string `json:"errorCode"`
			} `json:"details"`
		} `json:"error"`
	}
	json.Unmarshal(raw, &failure)
	for _, d := range failure.Error.Details {
		if d.Code == "UNREGISTERED" {
			return true, nil
		}
	}
	return false, errors.New("android push deferred")
}
