package dal

import (
	"testing"

	"github.com/stretchr/testify/require"

	entity "sico-backend/internal/entity/conversation/conversation"
	conversationdto "sico-backend/internal/transport/http/dto/conversation"
)

func TestConversationDO2POLeavesAbsentExtraInfoNil(t *testing.T) {
	dao := new(ConversationDAO)

	po := dao.conversationDO2PO(&entity.Conversation{})

	require.Nil(t, po.ExtraInfo)
}

func TestConversationDO2POSerializesExtraInfo(t *testing.T) {
	dao := new(ConversationDAO)

	po := dao.conversationDO2PO(&entity.Conversation{ExtraInfo: &conversationdto.ConversationExtraInfo{
		ScheduledTaskId:    7,
		ScheduledTaskRunId: 8,
	}})

	require.Equal(t, int64(7), po.ExtraInfo.ScheduledTaskId)
	require.Equal(t, int64(8), po.ExtraInfo.ScheduledTaskRunId)
}
