package impl

import (
	"context"
	"errors"
	"net/url"
	"os"
	"strings"

	"gorm.io/gorm"

	"sico-backend/internal/consts"
	"sico-backend/internal/infra/storage"
	"sico-backend/internal/shared/apperr"
	"sico-backend/internal/shared/errcode"
	projectrepo "sico-backend/internal/store/project/repository"
)

type emulatorAppProjectAssetLookup interface {
	GetProjectAssetByObjectKey(
		ctx context.Context,
		projectID string,
		objectKey string,
	) (*projectrepo.ProjectAssetModel, error)
}

type emulatorAppProjectAssetRef struct {
	projectID string
	objectKey string
}

func (s *Service) resolveEmulatorAppInstallURL(ctx context.Context, rawURL string) (string, error) {
	parsed, assetRef, relative, err := parseEmulatorAppAssetURL(rawURL)
	if err != nil {
		return "", err
	}
	if s == nil || s.ProjectAssets == nil {
		return "", apperr.New(errcode.CommonUnavailable, "project asset service unavailable")
	}
	asset, err := s.ProjectAssets.GetProjectAssetByObjectKey(ctx, assetRef.projectID, assetRef.objectKey)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", apperr.New(errcode.CommonInvalidParam, "url must reference a completed project asset")
		}
		return "", err
	}
	if asset == nil {
		return "", apperr.New(errcode.CommonInvalidParam, "url must reference a completed project asset")
	}

	assetPath := assetRef.projectID + "/" + assetRef.objectKey
	storageURL, err := storage.PathToUrl(assetPath)
	if err != nil {
		return "", err
	}
	downloadURL, err := emulatorAppDownloadURL(storageURL)
	if err != nil {
		return "", err
	}

	if relative {
		expectedPath := "/storage/" + assetPath
		if parsed.EscapedPath() != expectedPath {
			return "", apperr.New(errcode.CommonInvalidParam, "url must use the platform asset URL")
		}
		return downloadURL, nil
	}
	if !sameEmulatorAppURL(parsed, storageURL) && !sameEmulatorAppURL(parsed, downloadURL) {
		return "", apperr.New(errcode.CommonInvalidParam, "url must use the platform asset URL")
	}
	return downloadURL, nil
}

func parseEmulatorAppAssetURL(
	rawURL string,
) (*url.URL, *emulatorAppProjectAssetRef, bool, error) {
	rawURL = strings.TrimSpace(rawURL)
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed == nil || rawURL == "" {
		return nil, nil, false, apperr.New(errcode.CommonInvalidParam, "url must be a valid platform asset URL")
	}
	if err := validateParsedEmulatorAppURL(parsed, rawURL); err != nil {
		return nil, nil, false, err
	}

	assetRef, err := emulatorAppAssetRefFromPath(parsed.EscapedPath())
	if err != nil {
		return nil, nil, false, err
	}
	return parsed, assetRef, !parsed.IsAbs(), nil
}

func validateParsedEmulatorAppURL(parsed *url.URL, rawURL string) error {
	if parsed.User != nil {
		return apperr.New(errcode.CommonInvalidParam, "url must not include embedded credentials")
	}
	if parsed.RawQuery != "" || parsed.Fragment != "" {
		return apperr.New(
			errcode.CommonInvalidParam,
			"url must not include query parameters or fragments",
		)
	}

	if !parsed.IsAbs() {
		if !strings.HasPrefix(rawURL, "/storage/") {
			return apperr.New(errcode.CommonInvalidParam, "url must use the platform asset URL")
		}
		return nil
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return apperr.New(errcode.CommonInvalidParam, "url must use http or https")
	}
	if parsed.Hostname() == "" {
		return apperr.New(errcode.CommonInvalidParam, "url must include a hostname")
	}
	return nil
}

func emulatorAppAssetRefFromPath(escapedPath string) (*emulatorAppProjectAssetRef, error) {
	segments, err := emulatorAppURLPathSegments(escapedPath)
	if err != nil {
		return nil, err
	}
	var projectID, objectKey string
	switch {
	case len(segments) == 3 && segments[0] == "storage":
		projectID, objectKey = segments[1], segments[2]
	case len(segments) == 3:
		projectID, objectKey = segments[1], segments[2]
	case len(segments) == 2:
		projectID, objectKey = segments[0], segments[1]
	default:
		return nil, apperr.New(
			errcode.CommonInvalidParam,
			"url must reference a completed project asset",
		)
	}
	return &emulatorAppProjectAssetRef{projectID: projectID, objectKey: objectKey}, nil
}

func emulatorAppURLPathSegments(escapedPath string) ([]string, error) {
	escapedPath = strings.Trim(escapedPath, "/")
	if escapedPath == "" {
		return nil, nil
	}
	rawSegments := strings.Split(escapedPath, "/")
	segments := make([]string, 0, len(rawSegments))
	for _, rawSegment := range rawSegments {
		segment, err := url.PathUnescape(rawSegment)
		if err != nil || segment == "" || strings.Contains(segment, "/") {
			return nil, apperr.New(
				errcode.CommonInvalidParam,
				"url must reference a completed project asset",
			)
		}
		segments = append(segments, segment)
	}
	return segments, nil
}

func emulatorAppDownloadURL(storageURL string) (string, error) {
	storageType := strings.ToLower(strings.TrimSpace(os.Getenv(consts.StorageType)))
	if storageType == "azure_blob" || storageType == "blob" {
		return storageURL, nil
	}
	publicEndpoint := strings.TrimRight(strings.TrimSpace(os.Getenv("SICO_PUBLIC_ENDPOINT")), "/")
	if publicEndpoint == "" {
		return "", apperr.New(errcode.CommonUnavailable, "public endpoint is required for emulator app downloads")
	}
	parsed, err := url.Parse(storageURL)
	if err != nil {
		return "", apperr.New(errcode.CommonInternalError, "failed to resolve emulator app download URL")
	}
	path := "/" + strings.TrimLeft(parsed.EscapedPath(), "/")
	if !strings.HasPrefix(path, "/storage/") {
		path = "/storage" + path
	}
	return publicEndpoint + path, nil
}

func sameEmulatorAppURL(incoming *url.URL, expected string) bool {
	parsedExpected, err := url.Parse(expected)
	if err != nil || parsedExpected == nil {
		return false
	}
	return strings.EqualFold(incoming.Scheme, parsedExpected.Scheme) &&
		strings.EqualFold(incoming.Hostname(), parsedExpected.Hostname()) &&
		incoming.Port() == parsedExpected.Port() &&
		incoming.EscapedPath() == parsedExpected.EscapedPath() &&
		incoming.RawQuery == parsedExpected.RawQuery
}
