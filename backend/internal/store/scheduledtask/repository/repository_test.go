package repository

import (
	"testing"

	"github.com/stretchr/testify/require"

	commondto "sico-backend/internal/transport/http/dto/common"
	scheduledtaskdto "sico-backend/internal/transport/http/dto/scheduledtask"
)

func TestMarshalTaskAttachments(t *testing.T) {
	value, err := marshalTaskAttachments([]*commondto.Attachment{{
		Name: "report.csv",
		Uri:  "project/report.csv",
		Type: "text/csv",
		Size: 42,
		Id:   7,
	}})

	require.NoError(t, err)
	require.JSONEq(t, `[{
		"name":"report.csv",
		"uri":"project/report.csv",
		"type":"text/csv",
			"sasUrl":"",
		"size":42,
		"id":7
	}]`, string(value))
}

func TestMarshalTaskAttachmentsEmpty(t *testing.T) {
	value, err := marshalTaskAttachments([]*commondto.Attachment{})

	require.NoError(t, err)
	require.JSONEq(t, `[]`, string(value))
}

func TestMarshalTaskExtraInfo(t *testing.T) {
	value, err := marshalTaskExtraInfo(&scheduledtaskdto.ScheduledTaskExtraInfo{
		SendEmailOnComplete: true,
	})

	require.NoError(t, err)
	require.JSONEq(t, `{"sendEmailOnComplete":true}`, string(value))
}

func TestMarshalTaskExtraInfoNil(t *testing.T) {
	value, err := marshalTaskExtraInfo(nil)

	require.NoError(t, err)
	require.Nil(t, value)
}
