// Package testsupport provides isolated fixtures only in the explicitly named test database.
package testsupport

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"testing"
)

type Fixture struct {
	DB                                                *pgxpool.Pool
	ClassID, OtherClassID, Teacher, Student, Outsider string
}

func Database(t *testing.T) *Fixture {
	t.Helper()
	dsn := os.Getenv("EDUNEXUS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set EDUNEXUS_TEST_DATABASE_URL to the isolated edunexus_features database")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ConnConfig.Database != "edunexus_features" {
		t.Fatal("integration tests require the isolated edunexus_features database")
	}
	db, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	f := &Fixture{db, uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()}
	ctx := context.Background()
	for _, id := range []string{f.Teacher, f.Student, f.Outsider} {
		_, err = db.Exec(ctx, `INSERT INTO users(id,email,username,password_hash,first_name,last_name,email_verified) VALUES($1::uuid,$2,$3,'fixture','Test','User',true)`, id, id+"@example.invalid", "fixture_"+id[:8])
		if err != nil {
			t.Fatal(err)
		}
	}
	for i, id := range []string{f.ClassID, f.OtherClassID} {
		_, err = db.Exec(ctx, `INSERT INTO classrooms(id,owner_id,name,class_code) VALUES($1::uuid,$2::uuid,'Test class',$3)`, id, f.Teacher, uuid.NewString()[:6])
		if err != nil {
			t.Fatal(err)
		}
		_, err = db.Exec(ctx, `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'teacher','active',NULL),($1::uuid,$3::uuid,'student','active','001') ON CONFLICT(classroom_id,user_id) DO UPDATE SET member_role=excluded.member_role,status=excluded.status,student_roll=excluded.student_roll`, id, f.Teacher, []string{f.Student, f.Outsider}[i])
		if err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		db.Exec(ctx, `DELETE FROM classrooms WHERE id=ANY($1::uuid[])`, []string{f.ClassID, f.OtherClassID})
		db.Exec(ctx, `DELETE FROM users WHERE id=ANY($1::uuid[])`, []string{f.Teacher, f.Student, f.Outsider})
		db.Close()
	})
	return f
}
