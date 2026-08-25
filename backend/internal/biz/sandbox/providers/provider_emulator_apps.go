package providers

import (
	"context"
	"strings"

	sandboximpl "sico-backend/internal/biz/sandbox/impl"
)

type emulatorAppBatchRequest struct {
	Indices     []int  `json:"indices"`
	AppFilter   string `json:"app_filter,omitempty"`
	URL         string `json:"url,omitempty"`
	Package     string `json:"package,omitempty"`
	MaxParallel *int32 `json:"max_parallel,omitempty"`
}

func (p *EmulatorProvider) ListAppsBatch(
	ctx context.Context,
	baseURL string,
	indices []int,
	appFilter string,
	maxParallel int32,
) (*sandboximpl.EmulatorAppBatchResponse, error) {
	payload := emulatorAppBatchRequest{
		Indices:     indices,
		AppFilter:   appFilter,
		MaxParallel: emulatorAppMaxParallelPtr(maxParallel),
	}

	var response sandboximpl.EmulatorAppBatchResponse
	endpoint := strings.TrimRight(baseURL, "/") + "/api/v1/emulators/apps/list-batch"
	if err := p.appClient().postJSON(ctx, endpoint, payload, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (p *EmulatorProvider) InstallAppBatch(
	ctx context.Context,
	baseURL string,
	indices []int,
	appURL string,
	maxParallel int32,
) (*sandboximpl.EmulatorAppBatchResponse, error) {
	payload := emulatorAppBatchRequest{
		Indices:     indices,
		URL:         appURL,
		MaxParallel: emulatorAppMaxParallelPtr(maxParallel),
	}

	var response sandboximpl.EmulatorAppBatchResponse
	endpoint := strings.TrimRight(baseURL, "/") + "/api/v1/emulators/apps/install-url-batch"
	if err := p.appClient().postJSON(ctx, endpoint, payload, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (p *EmulatorProvider) UninstallAppBatch(
	ctx context.Context,
	baseURL string,
	indices []int,
	packageName string,
	maxParallel int32,
) (*sandboximpl.EmulatorAppBatchResponse, error) {
	payload := emulatorAppBatchRequest{
		Indices:     indices,
		Package:     packageName,
		MaxParallel: emulatorAppMaxParallelPtr(maxParallel),
	}

	var response sandboximpl.EmulatorAppBatchResponse
	endpoint := strings.TrimRight(baseURL, "/") + "/api/v1/emulators/apps/uninstall-batch"
	if err := p.appClient().postJSON(ctx, endpoint, payload, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func emulatorAppMaxParallelPtr(maxParallel int32) *int32 {
	if maxParallel <= 0 {
		return nil
	}
	return &maxParallel
}
