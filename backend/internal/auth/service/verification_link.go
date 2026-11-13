package service

import (
	"errors"
	"net/url"
	"os"
	"strings"
)

// verificationPage uses the same public origin as classroom invitation emails.
func verificationPage() (*url.URL, error) {
	origin := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if origin == "" {
		origin = "http://localhost:3000"
	}
	page, err := url.Parse(origin)
	if err != nil || page.Host == "" || page.User != nil || page.RawQuery != "" || page.Fragment != "" || (page.Path != "" && page.Path != "/") ||
		(page.Scheme != "https" && !(page.Scheme == "http" && (page.Hostname() == "localhost" || page.Hostname() == "127.0.0.1"))) {
		return nil, errors.New("FRONTEND_URL must be an HTTPS origin or local development origin")
	}
	page.Path = "/verify-email"
	return page, nil
}
