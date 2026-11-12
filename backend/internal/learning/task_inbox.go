package learning

import (
	"github.com/gofiber/fiber/v2"
	"net/url"
	"strconv"
	"strings"
)

// TaskInbox derives work from current memberships; dismissing an alert never
// dismisses the underlying coursework. Cursor ordering is stable across pages.
func (h *Handler) TaskInbox(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 || offset > 10000 {
		return fail(400, "Invalid page")
	}
	kind := c.Query("kind", "")
	if kind != "" && kind != "assignment" && kind != "exam" && kind != "recheck" && kind != "update" {
		return fail(400, "Invalid task type")
	}
	class := c.Query("class", "")
	if class != "" && validID(class) != nil {
		return fail(400, "Invalid class")
	}
	rows, err := h.db.Query(c.UserContext(), `WITH access AS (
 SELECT cl.id,cl.name,m.member_role FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND ($2='' OR cl.id=NULLIF($2,'')::uuid)
 ), tasks AS (
 SELECT 'assignment:'||a.id id,'assignment' kind,a.title,cl.id classroom_id,cl.name classroom_name,cl.member_role role,a.due_at at,
 CASE WHEN cl.member_role='student' THEN CASE WHEN a.due_at<now() THEN 'overdue' ELSE 'pending' END ELSE 'needs_grading' END state,
 'classwork&work=assignments&assignment='||a.id tab
 FROM classroom_assignments a JOIN access cl ON cl.id=a.classroom_id WHERE a.status='published' AND
 ((cl.member_role='student' AND NOT EXISTS(SELECT 1 FROM classroom_assignment_submissions s WHERE s.assignment_id=a.id AND s.student_id=$1::uuid)) OR
 (cl.member_role='teacher' AND EXISTS(SELECT 1 FROM classroom_assignment_submissions s WHERE s.assignment_id=a.id AND s.awarded_points IS NULL AND s.version=(SELECT max(s2.version) FROM classroom_assignment_submissions s2 WHERE s2.assignment_id=s.assignment_id AND s2.student_id=s.student_id))))
 UNION ALL
 SELECT 'exam:'||e.id,'exam',e.title,cl.id,cl.name,cl.member_role,e.starts_at,CASE WHEN e.starts_at<=now() THEN 'available' ELSE 'upcoming' END,'exam' FROM classroom_exams e JOIN access cl ON cl.id=e.classroom_id WHERE e.status='published' AND e.closed_at IS NULL AND e.ends_at>now() AND e.starts_at<now()+interval '30 days' AND (cl.member_role='teacher' OR NOT EXISTS(SELECT 1 FROM classroom_exam_attempts a WHERE a.exam_id=e.id AND a.student_id=$1::uuid AND (a.status='submitted' OR a.expires_at<=now())))
 UNION ALL
 SELECT 'recheck:'||r.id,'recheck',r.title,cl.id,cl.name,cl.member_role,r.created_at,r.status,'results&review=1' FROM classroom_rechecks r JOIN access cl ON cl.id=r.classroom_id WHERE r.status IN ('open','reviewing') AND (cl.member_role='teacher' OR r.student_id=$1::uuid)
 UNION ALL
 SELECT 'update:'||n.id,'update',n.title,cl.id,cl.name,cl.member_role,n.created_at,'unread',n.url FROM user_notifications n JOIN access cl ON cl.id=n.classroom_id WHERE n.user_id=$1::uuid AND n.read_at IS NULL
 ) SELECT id,kind,title,classroom_id::text,classroom_name,role,at,state,tab FROM tasks WHERE ($3='' OR kind=$3) ORDER BY CASE WHEN state='overdue' THEN 0 WHEN state IN ('needs_grading','open','reviewing') THEN 1 ELSE 2 END,at,id LIMIT 51 OFFSET $4`, user, class, kind, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, k, title, cl, name, role, state, tab string
		var at any
		if err = rows.Scan(&id, &k, &title, &cl, &name, &role, &at, &state, &tab); err != nil {
			return err
		}
		prefix := "student"
		if role == "teacher" {
			prefix = "instructor"
		}
		destination := "/" + prefix + "/classrooms/" + cl
		target := destination + "?tab=" + tab
		// Notification URLs are created on the server. Malformed old records fall
		// back to the inbox instead of becoming arbitrary links.
		if k == "update" {
			target = "/notifications"
			parsed, e := url.Parse(tab)
			if e == nil && parsed.IsAbs() == false && parsed.Host == "" && !strings.ContainsAny(tab, "\\\r\n") && ((parsed.Path == destination) || (parsed.Path == "/messages" && parsed.Query().Get("class") == cl)) {
				target = tab
			}
		}
		out = append(out, fiber.Map{"id": id, "kind": k, "title": title, "classroom_id": cl, "classroom_name": name, "role": role, "at": at, "state": state, "url": target})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	next := -1
	if len(out) > 50 {
		out = out[:50]
		next = offset + 50
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"items": out, "next_offset": next})
}
