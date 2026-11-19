package exam

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestRedTeamTesterCapabilityRevocation(t *testing.T) {
	for _, scenario := range []string{"removed member", "disabled account", "archived class", "changed audience", "wrong class tester", "closed exam", "submitted attempt", "expired ticket", "concurrent reuse"} {
		t.Run(scenario, func(t *testing.T) {
			f := testsupport.Database(t)
			exam, attempt, tester := uuid.NewString(), uuid.NewString(), uuid.NewString()
			exec := func(sql string, args ...any) {
				t.Helper()
				if _, err := f.DB.Exec(t.Context(), sql, args...); err != nil {
					t.Fatal(err)
				}
			}
			exec(`INSERT INTO classroom_question_testers(id,classroom_id,uploaded_by,name,sha256,executable) VALUES($1::uuid,$2::uuid,$3::uuid,'fixture.exe',$4,$5)`, tester, f.ClassID, f.Teacher, strings.Repeat("a", 64), make([]byte, 64))
			questions, _ := json.Marshal([]Question{{ID: "q", Kind: "coding", Prompt: "Write code", Points: 10, Tester: &TesterAttachment{ID: tester}}})
			exec(`INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Capability fixture',now()-interval '5 minutes',now()+interval '1 hour',60,'published',$4::jsonb)`, exam, f.ClassID, f.Teacher, questions)
			exec(`INSERT INTO classroom_exam_attempts(id,exam_id,student_id,expires_at) VALUES($1::uuid,$2::uuid,$3::uuid,now()+interval '1 hour')`, attempt, exam, f.Student)
			token := strings.ReplaceAll(uuid.NewString()+uuid.NewString(), "-", "")
			digest := sha256.Sum256([]byte(token))
			exec(`INSERT INTO classroom_tester_tickets(token_hash,tester_id,attempt_id,expires_at) VALUES($1,$2::uuid,$3::uuid,now()+interval '2 minutes')`, hex.EncodeToString(digest[:]), tester, attempt)
			switch scenario {
			case "removed member":
				exec(`DELETE FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student)
			case "disabled account":
				exec(`UPDATE users SET status='suspended' WHERE id=$1::uuid`, f.Student)
			case "archived class":
				exec(`UPDATE classrooms SET status='archived' WHERE id=$1::uuid`, f.ClassID)
			case "changed audience":
				exec(`UPDATE classroom_exams SET audience='{"mode":"even"}' WHERE id=$1::uuid`, exam)
			case "wrong class tester":
				exec(`UPDATE classroom_question_testers SET classroom_id=$2::uuid WHERE id=$1::uuid`, tester, f.OtherClassID)
			case "closed exam":
				exec(`UPDATE classroom_exams SET closed_at=now() WHERE id=$1::uuid`, exam)
			case "submitted attempt":
				exec(`UPDATE classroom_exam_attempts SET status='submitted',submitted_at=now() WHERE id=$1::uuid`, attempt)
			case "expired ticket":
				exec(`UPDATE classroom_tester_tickets SET expires_at=now()-interval '1 second' WHERE attempt_id=$1::uuid`, attempt)
			}
			app := fiber.New()
			app.Get("/local-testers/download", New(f.DB).DownloadTesterBundle)
			request := func() int {
				req := httptest.NewRequest("GET", "/local-testers/download", nil)
				req.Header.Set("Authorization", "Bearer "+token)
				res, err := app.Test(req, 10000)
				if err != nil {
					t.Error(err)
					return 0
				}
				defer res.Body.Close()
				return res.StatusCode
			}
			if scenario == "changed audience" {
				// Started attempts retain eligibility when an optional audience is edited.
				if code := request(); code != 200 {
					t.Fatalf("started attempt lost access: %d", code)
				}
				if code := request(); code != 403 {
					t.Fatalf("capability replay returned %d", code)
				}
				return
			}
			if scenario != "concurrent reuse" {
				if code := request(); code != 403 {
					t.Fatalf("revoked capability returned %d", code)
				}
				return
			}
			var wg sync.WaitGroup
			codes := make(chan int, 8)
			for range 8 {
				wg.Go(func() { codes <- request() })
			}
			wg.Wait()
			close(codes)
			accepted := 0
			for code := range codes {
				if code == 200 {
					accepted++
				} else if code != 403 {
					t.Errorf("unexpected status %d", code)
				}
			}
			if accepted != 1 {
				t.Fatalf("capability used %d times", accepted)
			}
		})
	}
}

func FuzzRedTeamTesterBytes(f *testing.F) {
	f.Add("fixture.exe", []byte("MZ"))
	pe := make([]byte, 132)
	copy(pe, "MZ")
	binary.LittleEndian.PutUint32(pe[60:64], 128)
	copy(pe[128:], "PE\x00\x00")
	f.Add("fixture.exe", pe)
	f.Add("../fixture.exe", make([]byte, 64))
	f.Fuzz(func(t *testing.T, name string, data []byte) {
		if validWindowsTester(name, data) && (len(data) < 64 || len(data) > maxTesterBytes) {
			t.Fatal("invalid tester size accepted")
		}
	})
}
