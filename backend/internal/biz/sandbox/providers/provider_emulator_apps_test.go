package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestEmulatorProviderListAppsBatch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/api/v1/emulators/apps/list-batch", r.URL.Path)
		var request emulatorAppBatchRequest
		require.NoError(t, json.NewDecoder(r.Body).Decode(&request))
		require.Equal(t, []int{2, 1}, request.Indices)
		require.Equal(t, "all", request.AppFilter)
		require.NotNil(t, request.MaxParallel)
		require.Equal(t, int32(10), *request.MaxParallel)
		w.Header().Set("Content-Type", "application/json")
		response := `{"status":"success","requested_count":2,"failed_count":0,` +
			`"results":[{"index":2,"status":"success","apps":[` +
			`{"package":"com.example","app_name":"Example","is_system":false}]}]}`
		_, _ = w.Write([]byte(response))
	}))
	defer server.Close()

	provider := &EmulatorProvider{http: newHTTPClient(time.Second)}
	response, err := provider.ListAppsBatch(
		context.Background(),
		server.URL,
		[]int{2, 1},
		"all",
		10,
	)

	require.NoError(t, err)
	require.Equal(t, int32(2), response.RequestedCount)
	require.Equal(t, "Example", response.Results[0].Apps[0].AppName)
}

func TestEmulatorProviderInstallAndUninstallBatchPaths(t *testing.T) {
	requestedPaths := make([]string, 0, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPaths = append(requestedPaths, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"success","requested_count":1,"failed_count":0,"results":[]}`))
	}))
	defer server.Close()

	provider := &EmulatorProvider{http: newHTTPClient(time.Second)}
	_, err := provider.InstallAppBatch(
		context.Background(), server.URL, []int{1}, "http://storage/app.apk", 10,
	)
	require.NoError(t, err)
	_, err = provider.UninstallAppBatch(
		context.Background(), server.URL, []int{1}, "com.example", 10,
	)
	require.NoError(t, err)
	require.Equal(t, []string{
		"/api/v1/emulators/apps/install-url-batch",
		"/api/v1/emulators/apps/uninstall-batch",
	}, requestedPaths)
}
