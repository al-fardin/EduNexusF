package learning

import (
	"context"
	"fmt"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"testing"
)

func TestAudiencePreviewHundredRollGroups(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	app.Post("/classrooms/:id/audience/preview", h.AudiencePreview)
	batch := uuid.NewString()
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO users(email,username,password_hash,first_name,last_name) SELECT $1||'-'||n||'@example.invalid',left($1,8)||'-'||n,'fixture','Audience','Student' FROM generate_series(2,100)n`, batch); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, err := f.DB.Exec(context.Background(), `DELETE FROM users WHERE email LIKE $1`, batch+"-%@example.invalid")
		if err != nil {
			t.Error(err)
		}
	})
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) SELECT $1::uuid,id,'student','active',lpad(split_part(username,'-',2),3,'0') FROM users WHERE email LIKE $2`, f.ClassID, batch+"-%@example.invalid"); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		rule fiber.Map
		want int
	}{{fiber.Map{"mode": "all"}, 100}, {fiber.Map{"mode": "odd"}, 50}, {fiber.Map{"mode": "even"}, 50}, {fiber.Map{"mode": "ranges", "ranges": []fiber.Map{{"from": 1, "to": 50}}}, 50}, {fiber.Map{"mode": "ranges", "ranges": []fiber.Map{{"from": 51, "to": 100}}}, 50}, {fiber.Map{"mode": "custom", "rolls": []string{"001", "050", "100"}}, 3}, {fiber.Map{"mode": "mixed", "parity": "odd", "ranges": []fiber.Map{{"from": 1, "to": 50}}, "rolls": []string{"088"}, "exclude_rolls": []string{"003"}}, 25}}
	for i, c := range cases {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			data := call(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/audience/preview", c.rule, 200)["data"].(map[string]any)
			if data["eligible"] != float64(c.want) || data["total"] != float64(100) {
				t.Fatal(data)
			}
		})
	}
}
