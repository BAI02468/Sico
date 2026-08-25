package email

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (c *client) generateSignedMessageRequest(message mailMessage) (*http.Request, error) {
	body, err := json.Marshal(message)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, c.u.String(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	pathAndQuery := fmt.Sprintf("%s?%s", c.u.Path, c.u.Query().Encode())
	timestamp := strings.ReplaceAll(time.Now().UTC().Format(time.RFC1123), "UTC", "GMT")
	hash := sha256.Sum256(body)
	hashBase64 := base64.StdEncoding.EncodeToString(hash[:])
	stringToSign := fmt.Sprintf(
		"%s\n%s\n%s;%s;%s",
		http.MethodPost, pathAndQuery, timestamp, c.u.Host, hashBase64,
	)

	hmacHash := hmac.New(sha256.New, c.accessKey)
	if _, err = hmacHash.Write([]byte(stringToSign)); err != nil {
		return nil, err
	}

	signature := base64.StdEncoding.EncodeToString(hmacHash.Sum(nil))
	authorization := fmt.Sprintf("HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=%s", signature)

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-ms-date", timestamp)
	req.Header.Set("x-ms-content-sha256", hashBase64)
	req.Header.Set("Authorization", authorization)

	return req, nil
}
