// Package activity supplies transaction-local attribution for audit triggers.
package activity

import (
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strings"
)

func SetActor(ctx context.Context, tx pgx.Tx, actor, reason string) error {
	if len(reason) > 1000 {
		return fiber.NewError(400, "Reason must be at most 1000 bytes")
	}
	_, err := tx.Exec(ctx, `SELECT set_config('edunexus.actor_id',$1,true),set_config('edunexus.activity_reason',$2,true)`, actor, strings.TrimSpace(reason))
	return err
}
