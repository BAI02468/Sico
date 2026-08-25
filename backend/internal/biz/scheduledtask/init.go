package scheduledtask

import (
	"github.com/google/wire"

	"sico-backend/internal/biz/conversation"
	"sico-backend/internal/biz/notification"
	"sico-backend/internal/biz/scheduledtask/impl"
	"sico-backend/internal/infra/cron"
	emailinfra "sico-backend/internal/infra/email"
	"sico-backend/internal/infra/storage"
	rbacrepository "sico-backend/internal/store/rbac/repository"
	"sico-backend/internal/store/scheduledtask/repository"
)

var defaultSvc Service

func Default() Service { return defaultSvc }

func InitService(components *impl.Components) Service {
	defaultSvc = impl.NewService(components)
	return defaultSvc
}

func ProvideConversationService(service conversation.Service) impl.ConversationService {
	return service
}

func ProvideNotificationService(service notification.Service) impl.NotificationService {
	return service
}

func ProvideEmailClient(client emailinfra.Client) impl.EmailClient { return client }

func ProvideUserRepository(repository rbacrepository.UserRepository) impl.UserRepository {
	return repository
}

func ProvideDeliverableStorage(storageService storage.Storage) impl.DeliverableStorage {
	return storageService
}

var ProviderSet = wire.NewSet(
	repository.NewRepository,
	cron.NewParser,
	ProvideConversationService,
	ProvideNotificationService,
	ProvideEmailClient,
	ProvideUserRepository,
	ProvideDeliverableStorage,
	wire.Struct(new(impl.Components), "*"),
	InitService,
)
