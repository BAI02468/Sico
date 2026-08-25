package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	sandboxbiz "sico-backend/internal/biz/sandbox"
	commondto "sico-backend/internal/transport/http/dto/common"
	sandboxdto "sico-backend/internal/transport/http/dto/sandbox"
)

// EmulatorListApps lists installed apps on emulator devices through backend aggregation.
// @Summary List emulator apps
// @Description List installed apps for emulator sandboxes.
// @Description When no sandbox IDs or instance ID is supplied, all emulator devices are queried.
// @Router /api/sico/sandbox/emulator/apps/list [POST]
// @Tags Sandbox-Emulator-Apps
// @Accept json
// @Produce json
// @Param request body sandboxdto.EmulatorAppListRequest false "App list request"
// @Success 200 {object} commondto.StandardResponse{data=sandboxdto.EmulatorAppBatchResult}
// @Security BearerAuth
func EmulatorListApps(c *gin.Context) {
	var req sandboxdto.EmulatorAppListRequest
	if err := shouldBindOptionalJSON(c, &req); err != nil {
		invalidParamRequestResponse(c, "invalid request body: "+err.Error())
		return
	}
	service, ok := sandboxbiz.DefaultImplService()
	if !ok || service == nil {
		internalServerErrorResponse(c, fmt.Errorf("sandbox service not available"))
		return
	}
	result, err := service.ListEmulatorApps(reqctx(c), &req)
	if err != nil {
		internalServerErrorResponse(c, err)
		return
	}
	emulatorAppSuccessResponse(c, result)
}

// EmulatorInstallApp starts an async APK install task from a completed project asset URL.
// @Summary Start emulator APK install task from URL
// @Router /api/sico/sandbox/emulator/apps/install [POST]
// @Tags Sandbox-Emulator-Apps
// @Accept json
// @Produce json
// @Param request body sandboxdto.EmulatorAppInstallRequest true "APK install request"
// @Success 200 {object} commondto.StandardResponse{data=sandboxdto.EmulatorAppTaskResult}
// @Security BearerAuth
func EmulatorInstallApp(c *gin.Context) {
	var req sandboxdto.EmulatorAppInstallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		invalidParamRequestResponse(c, "invalid request body: "+err.Error())
		return
	}
	service, ok := sandboxbiz.DefaultImplService()
	if !ok || service == nil {
		internalServerErrorResponse(c, fmt.Errorf("sandbox service not available"))
		return
	}
	result, err := service.SubmitInstallEmulatorApp(reqctx(c), &req)
	if err != nil {
		internalServerErrorResponse(c, err)
		return
	}
	emulatorAppTaskSuccessResponse(c, result)
}

// GetEmulatorAppTask returns async emulator app task status and result.
// @Summary Get emulator app task
// @Router /api/sico/sandbox/emulator/apps/tasks/{taskId} [GET]
// @Tags Sandbox-Emulator-Apps
// @Produce json
// @Param taskId path string true "Task ID"
// @Success 200 {object} commondto.StandardResponse{data=sandboxdto.EmulatorAppTaskResult}
// @Security BearerAuth
func GetEmulatorAppTask(c *gin.Context) {
	service, ok := sandboxbiz.DefaultImplService()
	if !ok || service == nil {
		internalServerErrorResponse(c, fmt.Errorf("sandbox service not available"))
		return
	}
	result, err := service.GetEmulatorAppInstallTask(reqctx(c), c.Param("taskId"))
	if err != nil {
		internalServerErrorResponse(c, err)
		return
	}
	emulatorAppTaskSuccessResponse(c, result)
}

// EmulatorUninstallApp uninstalls a package on one or more emulator devices.
// @Summary Uninstall emulator app
// @Router /api/sico/sandbox/emulator/apps/uninstall [POST]
// @Tags Sandbox-Emulator-Apps
// @Accept json
// @Produce json
// @Param request body sandboxdto.EmulatorAppUninstallRequest true "App uninstall request"
// @Success 200 {object} commondto.StandardResponse{data=sandboxdto.EmulatorAppBatchResult}
// @Security BearerAuth
func EmulatorUninstallApp(c *gin.Context) {
	var req sandboxdto.EmulatorAppUninstallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		invalidParamRequestResponse(c, "invalid request body: "+err.Error())
		return
	}
	service, ok := sandboxbiz.DefaultImplService()
	if !ok || service == nil {
		internalServerErrorResponse(c, fmt.Errorf("sandbox service not available"))
		return
	}
	result, err := service.UninstallEmulatorApp(reqctx(c), &req)
	if err != nil {
		internalServerErrorResponse(c, err)
		return
	}
	emulatorAppSuccessResponse(c, result)
}

func emulatorAppSuccessResponse(c *gin.Context, result *sandboxdto.EmulatorAppBatchResult) {
	c.JSON(http.StatusOK, commondto.StandardResponse{Code: 0, Msg: "success", Data: result})
}

func emulatorAppTaskSuccessResponse(c *gin.Context, result *sandboxdto.EmulatorAppTaskResult) {
	c.JSON(http.StatusOK, commondto.StandardResponse{Code: 0, Msg: "success", Data: result})
}

func shouldBindOptionalJSON(c *gin.Context, out any) error {
	if c.Request == nil || c.Request.Body == nil || c.Request.ContentLength == 0 {
		return nil
	}
	return c.ShouldBindJSON(out)
}
