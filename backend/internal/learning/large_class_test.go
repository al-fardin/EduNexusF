package learning

import (
	"context"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/google/uuid"
	"testing"
	"time"
)

func TestLargeClassProgressAndGradebook(t *testing.T) {
	f := testsupport.Database(t)
	batch := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO users(email,username,password_hash,first_name,last_name) SELECT $1||'-'||i||'@example.invalid',left($1,8)||'-'||i,'fixture','Large','Class' FROM generate_series(1,500)i`, batch)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, err := f.DB.Exec(ctx, `DELETE FROM users WHERE email LIKE $1`, batch+"-%@example.invalid"); err != nil {
			t.Error(err)
		}
	})
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) SELECT $1::uuid,id,'student','active',username FROM users WHERE email LIKE $2`, f.ClassID, batch+"-%@example.invalid")
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_assignments(classroom_id,created_by,title,due_at,max_points,status) SELECT $1::uuid,$2::uuid,'Load assignment '||i,now()-interval '1 day',100,'published' FROM generate_series(1,100)i`, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	h := &Handler{db: f.DB}
	app := academicApp(h)
	app.Get("/classrooms/:id/gradebook", h.Gradebook)
	started := time.Now()
	progress := call(t, app, f.Teacher, "GET", "/classrooms/"+f.ClassID+"/progress", nil, 200)["data"].(map[string]any)
	if len(progress["students"].([]any)) != 501 {
		t.Fatal("roster truncated")
	}
	book := call(t, app, f.Teacher, "GET", "/classrooms/"+f.ClassID+"/gradebook", nil, 200)["data"].(map[string]any)
	if len(book["students"].([]any)) != 501 || len(book["columns"].([]any)) != 100 {
		t.Fatal("gradebook incomplete")
	}
	t.Logf("501 students × 100 assignments, progress and gradebook: %s", time.Since(started))
}
