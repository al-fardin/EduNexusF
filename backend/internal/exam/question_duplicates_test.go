package exam

import (
	"bytes"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestBankDuplicatePreviewChecksMembershipAndNeverWrites(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_question_bank(classroom_id,created_by,question,topic,difficulty) VALUES($1::uuid,$2::uuid,'{"id":"q","kind":"mcq","prompt":"Prime   Numbers","points":1,"options":["2","4"],"correct_option":0}','Logic','easy')`, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Post("/classrooms/:id/question-bank/duplicates", h.BankDuplicates)
	for _, tc := range []struct {
		user   string
		status int
	}{{f.Teacher, 200}, {f.Student, 403}, {f.Outsider, 403}} {
		req := httptest.NewRequest("POST", "/classrooms/"+f.ClassID+"/question-bank/duplicates", strings.NewReader(`{"prompts":[" prime numbers ","Another question"]}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-User", tc.user)
		res, e := app.Test(req)
		if e != nil {
			t.Fatal(e)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != tc.status {
			t.Fatalf("%s: %d %s", tc.user, res.StatusCode, body)
		}
		if tc.status == 200 && (!bytes.Contains(body, []byte("Prime   Numbers")) || bytes.Contains(body, []byte("correct_option"))) {
			t.Fatal("duplicate preview must return matches without keys", string(body))
		}
	}
	var count int
	if e := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_question_bank WHERE classroom_id=$1::uuid`, f.ClassID).Scan(&count); e != nil || count != 1 {
		t.Fatal("preview changed bank", count, e)
	}
}
