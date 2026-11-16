// Package contentrelease manages transactional publication of classroom coursework.
package contentrelease

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Save(ctx context.Context, tx pgx.Tx, class, actor, kind, id string, at *time.Time) error {
	if at == nil {
		_, err := tx.Exec(ctx, `UPDATE classroom_content_schedules SET state='cancelled',version=version+1,updated_at=now() WHERE resource_id=$1::uuid AND state IN ('scheduled','blocked')`, id)
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO classroom_content_schedules(resource_id,classroom_id,kind,assignment_id,material_id,actor_id,publish_at)
 VALUES($1::uuid,$2::uuid,$3,CASE WHEN $3='assignment' THEN $1::uuid END,CASE WHEN $3='material' THEN $1::uuid END,$4::uuid,$5)
 ON CONFLICT(resource_id) DO UPDATE SET actor_id=$4::uuid,publish_at=$5,state='scheduled',version=classroom_content_schedules.version+1,error='',updated_at=now()`, id, class, kind, actor, at)
	return err
}

// LockResource establishes the same resource-before-schedule lock order for every writer.
func LockResource(ctx context.Context, tx pgx.Tx, kind, id, class string, skip bool) error {
	table := "classroom_assignments"
	if kind == "material" {
		table = "classroom_materials"
	} else if kind != "assignment" {
		return errors.New("invalid content kind")
	}
	suffix := ""
	if skip {
		suffix = " SKIP LOCKED"
	}
	var found string
	return tx.QueryRow(ctx, `SELECT id::text FROM `+table+` WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`+suffix, id, class).Scan(&found)
}

func Publish(ctx context.Context, tx pgx.Tx, kind, id, class, actor string) error {
	if kind == "assignment" {
		_, err := tx.Exec(ctx, `UPDATE classroom_assignments SET status='published' WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='draft'`, id, class)
		if err != nil {
			return err
		}
	} else if kind == "material" {
		_, err := tx.Exec(ctx, `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id)
 SELECT classroom_id,$3::uuid,'material',title,COALESCE(NULLIF(description,''),'New learning material: '||title),'material',id FROM classroom_materials m
 WHERE m.id=$1::uuid AND m.classroom_id=$2::uuid AND NOT EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.reference_type='material' AND p.reference_id=m.id)`, id, class, actor)
		if err != nil {
			return err
		}
	} else {
		return errors.New("invalid content kind")
	}
	_, err := tx.Exec(ctx, `UPDATE classroom_content_schedules SET state='published',version=version+1,error='',updated_at=now() WHERE resource_id=$1::uuid`, id)
	return err
}

func PublishOne(ctx context.Context, pool *pgxpool.Pool) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var id, class, kind, actor string
	// Resource locks come first. Multiple workers safely skip resources being edited.
	rows, err := tx.Query(ctx, `SELECT resource_id::text,classroom_id::text,kind FROM classroom_content_schedules WHERE state='scheduled' AND publish_at<=now() ORDER BY publish_at,resource_id LIMIT 20`)
	if err != nil {
		return err
	}
	type candidate struct{ id, class, kind string }
	list := []candidate{}
	for rows.Next() {
		var c candidate
		if err = rows.Scan(&c.id, &c.class, &c.kind); err != nil {
			rows.Close()
			return err
		}
		list = append(list, c)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	locked := false
	for _, c := range list {
		if err = LockResource(ctx, tx, c.kind, c.id, c.class, true); errors.Is(err, pgx.ErrNoRows) {
			continue
		} else if err != nil {
			return err
		}
		err = tx.QueryRow(ctx, `SELECT COALESCE(actor_id::text,'') FROM classroom_content_schedules WHERE resource_id=$1::uuid AND state='scheduled' AND publish_at<=now() FOR UPDATE`, c.id).Scan(&actor)
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		if err != nil {
			return err
		}
		id, class, kind = c.id, c.class, c.kind
		locked = true
		break
	}
	if !locked {
		return pgx.ErrNoRows
	}
	var allowed bool
	if actor != "" {
		err = tx.QueryRow(ctx, `SELECT cl.owner_id=$2::uuid OR p.user_id IS NULL OR COALESCE((p.permissions->>'coursework')::boolean,false)
 FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid JOIN users u ON u.id=m.user_id LEFT JOIN classroom_staff_permissions p ON p.classroom_id=cl.id AND p.user_id=m.user_id
 WHERE cl.id=$1::uuid AND cl.status='active' AND cl.deleted_at IS NULL AND m.member_role='teacher' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL FOR SHARE OF cl,m,u`, class, actor).Scan(&allowed)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
	}
	if !allowed {
		_, err = tx.Exec(ctx, `UPDATE classroom_content_schedules SET state='blocked',error='Teacher permissions or classroom access changed',version=version+1,updated_at=now() WHERE resource_id=$1::uuid`, id)
	} else {
		err = Publish(ctx, tx, kind, id, class, actor)
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
