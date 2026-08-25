package impl

import "context"

// EmulatorAppProvider is the app-management capability exposed by emulator providers.
type EmulatorAppProvider interface {
	Provider
	ParseResourceIDForProxy(resourceID string) (string, string, error)
	ListAppsBatch(
		ctx context.Context,
		baseURL string,
		indices []int,
		appFilter string,
		maxParallel int32,
	) (*EmulatorAppBatchResponse, error)
	InstallAppBatch(
		ctx context.Context,
		baseURL string,
		indices []int,
		appURL string,
		maxParallel int32,
	) (*EmulatorAppBatchResponse, error)
	UninstallAppBatch(
		ctx context.Context,
		baseURL string,
		indices []int,
		packageName string,
		maxParallel int32,
	) (*EmulatorAppBatchResponse, error)
}

type EmulatorAppInfoUpstream struct {
	Package  string `json:"package"`
	AppName  string `json:"app_name"`
	Version  string `json:"version"`
	IsSystem bool   `json:"is_system"`
}

type EmulatorAppBatchDeviceResult struct {
	Index        int                        `json:"index"`
	Serial       string                     `json:"serial,omitempty"`
	Status       string                     `json:"status,omitempty"`
	Apps         []*EmulatorAppInfoUpstream `json:"apps,omitempty"`
	Package      string                     `json:"package,omitempty"`
	ErrorMessage string                     `json:"error_message,omitempty"`
	ErrorCode    int32                      `json:"error_code,omitempty"`
}

type EmulatorAppBatchResponse struct {
	Status           string                         `json:"status"`
	RequestedCount   int32                          `json:"requested_count"`
	SucceededCount   int32                          `json:"succeeded_count,omitempty"`
	InstalledCount   int32                          `json:"installed_count,omitempty"`
	UninstalledCount int32                          `json:"uninstalled_count,omitempty"`
	FailedCount      int32                          `json:"failed_count"`
	MaxParallel      int32                          `json:"max_parallel,omitempty"`
	Results          []EmulatorAppBatchDeviceResult `json:"results"`
}
