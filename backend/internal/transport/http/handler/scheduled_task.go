package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	scheduledtaskbiz "sico-backend/internal/biz/scheduledtask"
	"sico-backend/internal/shared/apperr"
	"sico-backend/internal/shared/errcode"
	"sico-backend/internal/transport/http/dto/scheduledtask"
)

func scheduledTaskService(ctx *gin.Context) (scheduledtaskbiz.Service, bool) {
	svc := scheduledtaskbiz.Default()
	if svc == nil {
		internalServerErrorResponse(ctx, apperr.New(errcode.CommonUnavailable, "scheduled task service not initialized"))
		return nil, false
	}
	return svc, true
}

// CreateScheduledTask creates a recurring agent task.
// @Router /api/sico/scheduled-tasks [POST]
// @Tags scheduled-tasks
// @Accept json
// @Produce json
// @Param request body scheduledtask.CreateScheduledTaskRequest true "Create Scheduled Task"
// @Success 200 {object} scheduledtask.CreateScheduledTaskResponse
// @Security BearerAuth
func CreateScheduledTask(ctx *gin.Context) {
	var req scheduledtask.CreateScheduledTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		invalidParamRequestResponse(ctx, err.Error())
		return
	}
	svc, ok := scheduledTaskService(ctx)
	if !ok {
		return
	}
	resp, err := svc.Create(reqctx(ctx), &req)
	if err != nil {
		internalServerErrorResponse(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, resp)
}

// GetScheduledTask returns an owned scheduled task.
// @Router /api/sico/scheduled-tasks [GET]
// @Tags scheduled-tasks
// @Produce json
// @Param request query scheduledtask.GetScheduledTaskRequest true "Get Scheduled Task"
// @Success 200 {object} scheduledtask.GetScheduledTaskResponse
// @Security BearerAuth
func GetScheduledTask(ctx *gin.Context) {
	var req scheduledtask.GetScheduledTaskRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		invalidParamRequestResponse(ctx, err.Error())
		return
	}
	svc, ok := scheduledTaskService(ctx)
	if !ok {
		return
	}
	resp, err := svc.Get(reqctx(ctx), &req)
	if err != nil {
		internalServerErrorResponse(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, resp)
}

// UpdateScheduledTask replaces an owned scheduled task.
// @Router /api/sico/scheduled-tasks [PUT]
// @Tags scheduled-tasks
// @Accept json
// @Produce json
// @Param request body scheduledtask.UpdateScheduledTaskRequest true "Update Scheduled Task"
// @Success 200 {object} scheduledtask.UpdateScheduledTaskResponse
// @Security BearerAuth
func UpdateScheduledTask(ctx *gin.Context) {
	var req scheduledtask.UpdateScheduledTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		invalidParamRequestResponse(ctx, err.Error())
		return
	}
	svc, ok := scheduledTaskService(ctx)
	if !ok {
		return
	}
	resp, err := svc.Update(reqctx(ctx), &req)
	if err != nil {
		internalServerErrorResponse(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, resp)
}

// DeleteScheduledTask deletes an owned scheduled task.
// @Router /api/sico/scheduled-tasks [DELETE]
// @Tags scheduled-tasks
// @Produce json
// @Param request body scheduledtask.DeleteScheduledTaskRequest true "Delete Scheduled Task"
// @Success 200 {object} scheduledtask.DeleteScheduledTaskResponse
// @Security BearerAuth
func DeleteScheduledTask(ctx *gin.Context) {
	var req scheduledtask.DeleteScheduledTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		invalidParamRequestResponse(ctx, err.Error())
		return
	}
	svc, ok := scheduledTaskService(ctx)
	if !ok {
		return
	}
	resp, err := svc.Delete(reqctx(ctx), &req)
	if err != nil {
		internalServerErrorResponse(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, resp)
}

// ListScheduledTasks lists scheduled tasks owned by the caller.
// @Router /api/sico/scheduled-tasks/list [GET]
// @Tags scheduled-tasks
// @Produce json
// @Param request query scheduledtask.ListScheduledTasksRequest true "List Scheduled Tasks"
// @Success 200 {object} scheduledtask.ListScheduledTasksResponse
// @Security BearerAuth
func ListScheduledTasks(ctx *gin.Context) {
	var req scheduledtask.ListScheduledTasksRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		invalidParamRequestResponse(ctx, err.Error())
		return
	}
	svc, ok := scheduledTaskService(ctx)
	if !ok {
		return
	}
	resp, err := svc.List(reqctx(ctx), &req)
	if err != nil {
		internalServerErrorResponse(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, resp)
}
