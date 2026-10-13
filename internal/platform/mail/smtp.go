package mail

import (
	"fmt"
	"net/smtp"
)

type SMTPMailer struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

func NewSMTPMailer(
	host,
	port,
	username,
	password,
	from string,
) *SMTPMailer {

	return &SMTPMailer{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
		From:     from,
	}
}
func (m *SMTPMailer) Send(
	to string,
	subject string,
	body string,
) error {

	auth := smtp.PlainAuth(
		"",
		m.Username,
		m.Password,
		m.Host,
	)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s",
		m.From,
		to,
		subject,
		body,
	))

	return smtp.SendMail(
		m.Host+":"+m.Port,
		auth,
		m.From,
		[]string{to},
		msg,
	)
}