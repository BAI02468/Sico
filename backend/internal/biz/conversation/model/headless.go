package model

import (
	commondto "sico-backend/internal/transport/http/dto/common"
	conversationdto "sico-backend/internal/transport/http/dto/conversation"
)

type HeadlessChatRequest struct {
	AgentInstanceID    int64
	Message            string
	Attachments        []*commondto.Attachment
	SubmissionID       string
	ScheduledTaskID    int64
	ScheduledTaskRunID int64
}

type HeadlessChatResponse struct {
	ConversationID    int64
	TurnID            int64
	PlanStatus        conversationdto.PlanStatus
	Plan              *conversationdto.Plan
	DigitalWorkerName string
	FinalResponse     string
}
