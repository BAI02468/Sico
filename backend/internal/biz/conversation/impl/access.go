package impl

import (
	"context"

	"sico-backend/internal/biz/rbac"
)

func canReadAllConversations(ctx context.Context) bool {
	return rbac.Initialized() && rbac.IsPlatformAdmin(ctx)
}

func conversationReadQueryUsername(ctx context.Context, username string) string {
	if canReadAllConversations(ctx) {
		return ""
	}
	return username
}

func canReadConversation(ctx context.Context, username, creatorUsername string) bool {
	return username == creatorUsername || canReadAllConversations(ctx)
}
