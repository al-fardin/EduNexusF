package mail

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"
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

	for _, value := range []string{to, subject, m.From} {
		if strings.ContainsAny(value, "\r\n") {
			return fmt.Errorf("invalid mail header")
		}
	}

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

	var connection net.Conn
	var err error
	if m.Port == "465" {
		connection, err = tls.DialWithDialer(&net.Dialer{Timeout: 10 * time.Second}, "tcp", net.JoinHostPort(m.Host, m.Port), &tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12})
	} else {
		connection, err = net.DialTimeout("tcp", net.JoinHostPort(m.Host, m.Port), 10*time.Second)
	}
	if err != nil {
		return err
	}
	defer connection.Close()
	if err = connection.SetDeadline(time.Now().Add(15 * time.Second)); err != nil {
		return err
	}
	client, err := smtp.NewClient(connection, m.Host)
	if err != nil {
		return err
	}
	defer client.Close()
	if err = secureSMTP(client, m.Host); err != nil {
		return err
	}
	if m.Username != "" {
		if err = client.Auth(smtp.PlainAuth("", m.Username, m.Password, m.Host)); err != nil {
			return err
		}
	}
	if err = client.Mail(m.From); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = writer.Write(msg); err != nil {
		return err
	}
	if err = writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func secureSMTP(client *smtp.Client, host string) error {
	if state, ok := client.TLSConnectionState(); ok && state.Version >= tls.VersionTLS12 {
		return nil
	}
	if ok, _ := client.Extension("STARTTLS"); ok {
		return client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
	}
	// Local capture servers are useful for development. Remote reset links and
	// credentials must never be delivered through a downgraded plaintext channel.
	ip := net.ParseIP(host)
	if strings.EqualFold(host, "localhost") || (ip != nil && ip.IsLoopback()) {
		return nil
	}
	return fmt.Errorf("remote SMTP requires TLS")
}
