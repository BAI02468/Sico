package email

import (
	"encoding/base64"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"sico-backend/internal/consts"
)

const (
	apiPath            = "/emails:send"
	apiVersion         = "2023-03-31"
	defaultHTTPTimeout = 30 * time.Second
)

type client struct {
	enabled    bool
	u          *url.URL
	accessKey  []byte
	senderAddr string
	httpClient *http.Client
}

func NewClient() (Client, error) {
	endpoint := strings.TrimSpace(os.Getenv(consts.MailEndpoint))
	accessKey := strings.TrimSpace(os.Getenv(consts.MailAccessKey))
	senderAddr := strings.TrimSpace(os.Getenv(consts.MailSenderAddress))
	if endpoint == "" || accessKey == "" || senderAddr == "" {
		return &client{}, nil
	}

	rawKey, err := base64.StdEncoding.DecodeString(accessKey)
	if err != nil {
		return nil, err
	}

	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}

	query := url.Values{}
	query.Set("api-version", apiVersion)
	u.RawQuery = query.Encode()
	u.Path = apiPath

	return &client{
		enabled:    true,
		u:          u,
		accessKey:  rawKey,
		senderAddr: senderAddr,
		httpClient: &http.Client{Timeout: defaultHTTPTimeout},
	}, nil
}
