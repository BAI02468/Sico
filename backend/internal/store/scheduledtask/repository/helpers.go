package repository

import (
	"errors"
	"time"
)

var errClaimLost = errors.New("scheduled task occurrence was claimed by another worker")
var errRunActive = errors.New("scheduled task already has an active run")

func unixMilli() int64 { return time.Now().UnixMilli() }
