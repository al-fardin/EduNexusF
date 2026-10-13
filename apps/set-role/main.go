package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/database"
)

func main() {
	emailFlag := flag.String(
		"email",
		"",
		"user email address",
	)

	roleFlag := flag.String(
		"role",
		"",
		"new role: student, instructor, or admin",
	)

	flag.Parse()

	email := strings.ToLower(
		strings.TrimSpace(*emailFlag),
	)

	role := strings.ToLower(
		strings.TrimSpace(*roleFlag),
	)

	if email == "" {
		log.Fatal(
			"email is required: use -email",
		)
	}

	if role == "" {
		log.Fatal(
			"role is required: use -role",
		)
	}

	switch role {
	case "student",
		"instructor",
		"admin":
	default:
		log.Fatal(
			"invalid role: allowed roles are student, instructor, admin",
		)
	}

	cfg := config.Load()

	dbConfig := database.NewConfig(cfg)

	pool, err := database.Connect(
		dbConfig,
	)
	if err != nil {
		log.Fatalf(
			"failed to connect to database: %v",
			err,
		)
	}
	defer pool.Close()

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	result, err := pool.Exec(
		ctx,
		`
		UPDATE users
		SET
			role = $1,
			updated_at = NOW()
		WHERE LOWER(email) = LOWER($2)
		  AND deleted_at IS NULL
		`,
		role,
		email,
	)
	if err != nil {
		log.Fatalf(
			"failed to update role: %v",
			err,
		)
	}

	if result.RowsAffected() == 0 {
		log.Fatalf(
			"user not found for email: %s",
			email,
		)
	}

	fmt.Printf(
		"User role updated successfully\nEmail: %s\nRole: %s\n",
		email,
		role,
	)
}
