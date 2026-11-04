package main

import (
	"flag"
	"fmt"
	webpush "github.com/SherClockHolmes/webpush-go"
	"os"
	"path/filepath"
)

func main() {
	output := flag.String("out", "release-builds/push.env", "private environment file to create")
	subject := flag.String("subject", "https://edunexus.local", "HTTPS contact URL or mailto contact")
	flag.Parse()
	private, public, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		panic(err)
	}
	if err = os.MkdirAll(filepath.Dir(*output), 0700); err != nil {
		panic(err)
	}
	file, err := os.OpenFile(*output, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		panic(err)
	}
	defer file.Close()
	if _, err = fmt.Fprintf(file, "VAPID_PUBLIC_KEY=%s\nVAPID_PRIVATE_KEY=%s\nVAPID_SUBJECT=%s\n", public, private, *subject); err != nil {
		panic(err)
	}
	fmt.Println("Browser push keys created in", *output, "(keep this file private).")
}
