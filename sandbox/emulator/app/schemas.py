from __future__ import annotations

from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field


DeviceIndex = Annotated[int, Field(ge=0)]
AppFilter = Literal["user", "system", "all"]


class DeviceInfo(BaseModel):
    index: int = Field(..., ge=0)


class ListDevicesResponse(BaseModel):
    devices: list[DeviceInfo]


class CreateEmulatorsRequest(BaseModel):
    count: int = Field(1, ge=1, le=20)
    start: bool = True


class CloneEmulatorsRequest(BaseModel):
    count: int = Field(1, ge=1, le=20)


class StartEmulatorRequest(BaseModel):
    package: Optional[str] = None


class StartEmulatorsBatchRequest(BaseModel):
    indices: list[int] = Field(..., min_length=1, max_length=20)
    package: Optional[str] = None
    max_parallel: Optional[int] = Field(default=None, ge=1, le=20)


class PackageRequest(BaseModel):
    package: str = Field(..., min_length=1)


class DownloadAppRequest(BaseModel):
    url: str = Field(..., min_length=1)


class BatchDevicesRequest(BaseModel):
    indices: list[DeviceIndex] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of emulator indices (deviceIDList).",
    )
    max_parallel: Optional[int] = Field(
        default=None,
        ge=1,
        le=20,
        description="Optional cap on concurrent device operations.",
    )


class ListAppsBatchRequest(BatchDevicesRequest):
    """Request body for listing installed apps across multiple emulator devices."""

    app_filter: AppFilter = Field(
        default="user",
        description="Which apps to return: user, system, or all.",
    )


class InstallAppFromUrlBatchRequest(BatchDevicesRequest):
    """Request body for installing an APK from a remote URL across multiple devices."""

    url: str = Field(
        ...,
        min_length=1,
        description="HTTP(S) URL of the APK to download.",
    )


class UninstallAppBatchRequest(BatchDevicesRequest):
    """Request body for uninstalling a package across multiple devices."""

    package: str = Field(..., min_length=1, description="Package name to remove.")


class AdbShellRequest(BaseModel):
    """Generic ADB shell command request.

    Examples:
        - {"command": "input tap 500 500"}
        - {"command": "input swipe 100 100 500 500 300"}
        - {"command": "input text hello"}
        - {"command": "input keyevent 66"}
        - {"command": "pm list packages"}
    """

    command: str = Field(..., min_length=1, description="ADB shell command to execute")
