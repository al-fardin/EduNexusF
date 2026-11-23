package mail

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/smtp"
	"testing"
	"time"
)

func TestRemoteSMTPRejectsTLSStripping(t *testing.T) {
	for _, host := range []string{"mail.example.invalid", "localhost", "127.0.0.1", "::1"} {
		t.Run(host, func(t *testing.T) {
			server, conn := net.Pipe()
			defer conn.Close()
			_ = conn.SetDeadline(time.Now().Add(3 * time.Second))
			done := make(chan struct{})
			go func() {
				defer close(done)
				defer server.Close()
				_, _ = fmt.Fprint(server, "220 fixture ESMTP\r\n")
				reader := bufio.NewReader(server)
				_, _ = reader.ReadString('\n')
				_, _ = fmt.Fprint(server, "250 fixture\r\n")
				_, _ = io.Copy(io.Discard, reader)
			}()
			client, err := smtp.NewClient(conn, host)
			if err != nil {
				t.Fatal(err)
			}
			err = secureSMTP(client, host)
			if (err != nil) != (host == "mail.example.invalid") {
				t.Fatal("incorrect plaintext SMTP policy", host, err)
			}
			_ = client.Close()
			<-done
		})
	}
}
