package impl

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	commondto "sico-backend/internal/transport/http/dto/common"
)

func newStatusTestService(t *testing.T) (*Service, *miniredis.Miniredis) {
	t.Helper()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return &Service{cache: client}, server
}

func TestGetConversationRunStatuses(t *testing.T) {
	service, server := newStatusTestService(t)
	require.NoError(t, server.Set("ongoing-chat:conversation:1", "10"))

	statuses := service.GetConversationRunStatuses(context.Background(), []int64{1, 2})

	require.Equal(t, commondto.ConversationRunStatus_CONVERSATION_RUN_STATUS_RUNNING, statuses[1])
	require.Equal(t, commondto.ConversationRunStatus_CONVERSATION_RUN_STATUS_IDLE, statuses[2])

	server.Close()
	statuses = service.GetConversationRunStatuses(context.Background(), []int64{1})
	require.Equal(t, commondto.ConversationRunStatus_CONVERSATION_RUN_STATUS_UNKNOWN, statuses[1])
}

func TestGetAgentInstanceConversationRunStatuses(t *testing.T) {
	service, server := newStatusTestService(t)
	key := "ongoing-chat:agent-instance:1:conversations"
	_, err := server.ZAdd(key, float64(time.Now().Add(time.Minute).Unix()), "11")
	require.NoError(t, err)
	_, err = server.ZAdd(key, float64(time.Now().Add(-time.Minute).Unix()), "12")
	require.NoError(t, err)

	statuses := service.GetAgentInstanceConversationRunStatuses(context.Background(), []int64{1, 2})

	require.Equal(t, commondto.ConversationRunStatus_CONVERSATION_RUN_STATUS_RUNNING, statuses[1])
	require.Equal(t, commondto.ConversationRunStatus_CONVERSATION_RUN_STATUS_IDLE, statuses[2])

	server.Close()
	statuses = service.GetAgentInstanceConversationRunStatuses(context.Background(), []int64{1})
	require.Equal(t, commondto.ConversationRunStatus_CONVERSATION_RUN_STATUS_UNKNOWN, statuses[1], fmt.Sprint(statuses))
}
