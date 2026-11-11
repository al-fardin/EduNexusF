package errors

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUnexpectedErrorsDoNotExposeDatabaseDetails(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: Handler})
	app.Get("/private", func(c *fiber.Ctx) error { return errors.New("database password=private-fixture") })
	res, err := app.Test(httptest.NewRequest("GET", "/private", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != 500 || strings.Contains(string(body), "private-fixture") {
		t.Fatal(res.StatusCode, string(body))
	}
}
