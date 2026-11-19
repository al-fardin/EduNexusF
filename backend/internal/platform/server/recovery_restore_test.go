package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http/httptest"
	"os"
	"regexp"
	"testing"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Run after the paired dump/archive verification, exclusively on its new database.
func TestRedTeamRestoredApplication(t *testing.T) {
	name := os.Getenv("EDUNEXUS_RESTORE_DATABASE")
	if name == "" {
		t.Skip("requires a disposable paired restore")
	}
	if !regexp.MustCompile(`^edunexus_restore_[0-9_]+$`).MatchString(name) {
		t.Fatal("only a newly created restore database is allowed")
	}
	dbConfig, err := pgxpool.ParseConfig("")
	if err != nil {
		t.Fatal(err)
	}
	dbConfig.ConnConfig.Database = name
	pool, err := pgxpool.NewWithConfig(t.Context(), dbConfig)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	cfg := &config.Config{AppName: "Restored app fixture", AppEnv: "test", JWTSecret: "restore-fixture-signing-key-2026", JWTAccessExpire: "5m"}
	jwt, err := security.NewJWT(cfg)
	if err != nil {
		t.Fatal(err)
	}
	app := New(cfg, pool, jwt)
	token := ""
	call := func(method, path string, body any) []byte {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest(method, path, bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res, err := app.Test(req, 20000)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		payload, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			t.Fatalf("%s %s returned %d", method, path, res.StatusCode)
		}
		return payload
	}
	login := call("POST", "/auth/login", map[string]string{"email": "restore@example.invalid", "password": "RecoveryFixture_2026!"})
	var response struct {
		Data struct {
			AccessToken string `json:"access_token"`
		} `json:"data"`
	}
	if err = json.Unmarshal(login, &response); err != nil {
		t.Fatal(err)
	}
	token = response.Data.AccessToken
	if token == "" {
		t.Fatal("restored login did not return a token")
	}
	call("GET", "/auth/me", nil)
	base := "/classrooms/22222222-2222-4222-8222-222222222222"
	var materialID, messageID string
	if err = pool.QueryRow(t.Context(), `SELECT id::text FROM classroom_materials LIMIT 1`).Scan(&materialID); err != nil {
		t.Fatal(err)
	}
	if got := call("GET", base+"/materials/"+materialID+"/download", nil); string(got) != "recovery material" {
		t.Fatal("restored material content changed")
	}
	if got := call("GET", base+"/assignments/88888888-8888-4888-8888-888888888888/submissions/99999999-9999-4999-8999-999999999999/file", nil); string(got) != "recovery submission" {
		t.Fatal("restored submission content changed")
	}
	if err = pool.QueryRow(t.Context(), `SELECT id::text FROM classroom_messages LIMIT 1`).Scan(&messageID); err != nil {
		t.Fatal(err)
	}
	if got := call("GET", base+"/conversations/55555555-5555-4555-8555-555555555555/messages/"+messageID+"/file", nil); string(got) != "recovery message" {
		t.Fatal("restored message attachment changed")
	}
	if !bytes.Contains(call("GET", base+"/exams", nil), []byte("Recovery exam")) {
		t.Fatal("restored exam missing")
	}
	t.Log("Restored login, account, material, submission, message attachment and exam routes passed")
}
