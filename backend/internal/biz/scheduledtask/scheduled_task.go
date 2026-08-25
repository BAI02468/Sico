package scheduledtask

import (
	"context"

	pb "sico-backend/internal/transport/http/dto/scheduledtask"
)

type Service interface {
	Create(ctx context.Context, req *pb.CreateScheduledTaskRequest) (*pb.CreateScheduledTaskResponse, error)
	Get(ctx context.Context, req *pb.GetScheduledTaskRequest) (*pb.GetScheduledTaskResponse, error)
	Update(ctx context.Context, req *pb.UpdateScheduledTaskRequest) (*pb.UpdateScheduledTaskResponse, error)
	Delete(ctx context.Context, req *pb.DeleteScheduledTaskRequest) (*pb.DeleteScheduledTaskResponse, error)
	List(ctx context.Context, req *pb.ListScheduledTasksRequest) (*pb.ListScheduledTasksResponse, error)
	Start(ctx context.Context) error
}
