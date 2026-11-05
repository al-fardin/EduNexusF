// mobile-preview joins the local production frontend and API behind one HTTPS
// tunnel. It binds only to loopback; cloudflared supplies the public TLS endpoint.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

func gateway(public, web, backend *url.URL) http.Handler {
	proxy := func(target *url.URL, api bool) *httputil.ReverseProxy {
		p := &httputil.ReverseProxy{Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			if api {
				r.Out.URL.Path = strings.TrimPrefix(r.In.URL.Path, "/api")
				r.Out.URL.RawPath = ""
			}
			r.SetXForwarded()
			r.Out.Header.Set("X-Forwarded-Proto", "https")
			r.Out.Header.Del("Accept-Encoding")
		}}
		p.ModifyResponse = func(r *http.Response) error {
			r.Header.Set("X-Content-Type-Options", "nosniff")
			if api && r.Request.URL.Path == "/messaging/realtime-ticket" && r.StatusCode == 200 {
				defer r.Body.Close()
				raw, err := io.ReadAll(io.LimitReader(r.Body, 65537))
				if err != nil {
					return err
				}
				if len(raw) > 65536 {
					return fmt.Errorf("oversized ticket response")
				}
				var payload map[string]any
				if err = json.Unmarshal(raw, &payload); err != nil {
					return err
				}
				data, ok := payload["data"].(map[string]any)
				if !ok {
					return fmt.Errorf("invalid ticket response")
				}
				data["socket_url"] = "wss://" + public.Host + "/messaging/socket"
				raw, err = json.Marshal(payload)
				if err != nil {
					return err
				}
				r.Body = io.NopCloser(bytes.NewReader(raw))
				r.ContentLength = int64(len(raw))
				r.Header.Set("Content-Length", fmt.Sprint(len(raw)))
				r.Header.Set("Cache-Control", "no-store")
			}
			return nil
		}
		return p
	}
	frontend, api, socket := proxy(web, false), proxy(backend, true), proxy(backend, false)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.EqualFold(r.Host, public.Host) && r.Host != "127.0.0.1:3011" && r.Host != "localhost:3011" {
			http.Error(w, "Unknown workspace", 421)
			return
		}
		switch {
		case r.URL.Path == "/messaging/socket":
			socket.ServeHTTP(w, r)
		case strings.HasPrefix(r.URL.Path, "/api/"):
			api.ServeHTTP(w, r)
		default:
			frontend.ServeHTTP(w, r)
		}
	})
}

func main() {
	public := flag.String("public-url", "", "Temporary HTTPS workspace origin")
	web := flag.String("web", "http://127.0.0.1:3010", "Local production frontend")
	backend := flag.String("api", "http://127.0.0.1:8080", "Local API")
	flag.Parse()
	u, err := url.Parse(*public)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		log.Fatal("Provide an HTTPS origin with -public-url")
	}
	w, e := url.Parse(*web)
	if e != nil {
		log.Fatal(e)
	}
	b, e := url.Parse(*backend)
	if e != nil {
		log.Fatal(e)
	}
	server := &http.Server{Addr: "127.0.0.1:3011", Handler: gateway(u, w, b), ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second}
	log.Print("Mobile HTTPS gateway listening on 127.0.0.1:3011")
	log.Fatal(server.ListenAndServe())
}
