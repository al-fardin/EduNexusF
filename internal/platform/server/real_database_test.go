package server

import (
	"context"
	"fmt"
	"io"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Every connection is read-only: this can verify an existing local database
// without creating accounts, changing exams or delivering email.
func TestExistingDatabaseReadOnlyRoutes(t *testing.T) {
	dsn := os.Getenv("EDUNEXUS_REAL_READONLY_DATABASE_URL")
	if dsn == "" {
		t.Skip("set EDUNEXUS_REAL_READONLY_DATABASE_URL for existing-data verification")
	}
	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	poolConfig.AfterConnect = func(ctx context.Context, c *pgx.Conn) error {
		_, err := c.Exec(ctx, "SET default_transaction_read_only=on")
		return err
	}
	db, err := pgxpool.NewWithConfig(t.Context(), poolConfig)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	cfg := &config.Config{AppName: "Read-only verification", AppEnv: "test", JWTSecret: "read-only-route-check-not-a-server-key", JWTAccessExpire: "5m"}
	jwt, err := security.NewJWT(cfg)
	if err != nil {
		t.Fatal(err)
	}
	app := New(cfg, db, jwt)
	rows, err := db.Query(t.Context(), `SELECT cm.classroom_id::text,u.id::text,u.role,cm.member_role FROM classroom_memberships cm JOIN users u ON u.id=cm.user_id WHERE cm.status='active' ORDER BY cm.member_role LIMIT 20`)
	if err != nil {
		t.Fatal(err)
	}
	type member struct{ class, id, role, membership string }
	var members []member
	for rows.Next() {
		var m member
		if err = rows.Scan(&m.class, &m.id, &m.role, &m.membership); err != nil {
			t.Fatal(err)
		}
		members = append(members, m)
	}
	rows.Close()
	if len(members) == 0 {
		t.Fatal("no active memberships available for verification")
	}
	checked := 0
	for _, m := range members {
		token, err := jwt.GenerateToken(m.id, "readonly-check@example.invalid", m.role)
		if err != nil {
			t.Fatal(err)
		}
		paths := []string{"/notifications", "/classrooms/joined", "/classrooms/mine", "/workspace", "/workspace/files", "/messaging/classes", "/messaging/unread"}
		base := "/classrooms/" + m.class
		for _, suffix := range []string{"/details", "/message-recipients", "/messaging-settings", "/conversations", "/exams", "/assignments", "/analytics", "/tutor", "/tutor/sources", "/stream", "/materials"} {
			paths = append(paths, base+suffix)
		}
		if m.membership == "student" {
			paths = append(paths, base+"/exams/active")
		}
		if m.membership == "teacher" {
			paths = append(paths, base+"/question-bank")
		}
		for _, path := range paths {
			req := httptest.NewRequest("GET", path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res, e := app.Test(req, 10000)
			if e != nil {
				t.Fatal(e)
			}
			io.Copy(io.Discard, res.Body)
			res.Body.Close()
			if res.StatusCode != 200 {
				t.Errorf("%s route %s returned %d", m.membership, path, res.StatusCode)
			}
			checked++
		}
	}
	t.Log(fmt.Sprintf("Verified %d authenticated GET requests against existing data with read-only connections", checked))
}
