import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

import { type AttachmentUploadItem } from "../components/attachment-input";
import { MAX_ATTACHMENT_BYTES } from "../constants/attachment";
import { type CommonAttachment } from "../schemas/common-attachment";
import { makeId } from "../utils/id";

type SetAttachments = Dispatch<SetStateAction<AttachmentUploadItem[]>>;
type Upload = (file: File, signal: AbortSignal) => Promise<CommonAttachment>;
type MutableValue<T> = { current: T };

type Options = {
  attachments: AttachmentUploadItem[];
  setAttachments: SetAttachments;
  upload: Upload;
  fileTooLargeError: string;
  uploadFailedError: (file: File) => string;
  onUploadFailure: (error: unknown, file: File, message: string) => void;
  abortOnUnmount?: boolean;
};

type PendingUpload = {
  active: MutableValue<boolean>;
  controller: AbortController;
  controllers: Map<string, AbortController>;
  failureMessage: string;
  file: File;
  localId: string;
  onUploadFailure: Options["onUploadFailure"];
  setAttachments: SetAttachments;
  upload: Upload;
};

type StartUpload = Omit<
  PendingUpload,
  "controller" | "failureMessage" | "file" | "localId"
> & {
  uploadFailedError: Options["uploadFailedError"];
};

type ActionContext = Options & {
  active: MutableValue<boolean>;
  controllers: Map<string, AbortController>;
  setFileError: Dispatch<SetStateAction<string | null>>;
};

type AttachmentActions = Pick<
  AttachmentUploadLifecycle,
  "addFile" | "clear" | "removeAttachment" | "resetAttachments"
>;

export type AttachmentUploadLifecycle = {
  attachments: AttachmentUploadItem[];
  anyUploading: boolean;
  fileError: string | null;
  addFile: (file: File) => void;
  removeAttachment: (localId: string) => void;
  clear: () => void;
  resetAttachments: (attachments: AttachmentUploadItem[]) => void;
};

function abortControllers(controllers: Map<string, AbortController>): void {
  for (const controller of controllers.values()) {
    controller.abort();
  }
  controllers.clear();
}

function markReady(
  attachments: AttachmentUploadItem[],
  localId: string,
  assetRef: CommonAttachment,
): AttachmentUploadItem[] {
  return attachments.map((attachment) =>
    attachment.localId === localId
      ? {
          localId,
          file: attachment.file,
          status: "ready",
          assetRef,
        }
      : attachment,
  );
}

async function reconcileUpload(context: PendingUpload): Promise<void> {
  const { controller, file, localId } = context;
  try {
    const assetRef = await context.upload(file, controller.signal);
    if (!controller.signal.aborted && context.active.current) {
      context.setAttachments((previous) =>
        markReady(previous, localId, assetRef),
      );
    }
  } catch (error) {
    if (context.active.current) {
      context.setAttachments((previous) =>
        previous.filter((attachment) => attachment.localId !== localId),
      );
    }
    if (!controller.signal.aborted) {
      context.onUploadFailure(error, file, context.failureMessage);
    }
  } finally {
    context.controllers.delete(localId);
  }
}

function startUpload(context: StartUpload, file: File): void {
  const controller = new AbortController();
  const localId = makeId();
  context.controllers.set(localId, controller);
  context.setAttachments((previous) => [
    ...previous,
    { localId, file, status: "uploading", abortHandle: controller },
  ]);
  void reconcileUpload({
    ...context,
    controller,
    failureMessage: context.uploadFailedError(file),
    file,
    localId,
  });
}

function useUploadActivity(
  controllers: Map<string, AbortController>,
  abortOnUnmount: boolean,
): MutableValue<boolean> {
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    if (!abortOnUnmount) {
      return undefined;
    }
    return () => {
      activeRef.current = false;
      abortControllers(controllers);
    };
  }, [abortOnUnmount, controllers]);
  return activeRef;
}

function createAttachmentActions(context: ActionContext): AttachmentActions {
  const addFile = (file: File): void => {
    context.setFileError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      context.setFileError(context.fileTooLargeError);
      return;
    }
    startUpload(
      {
        active: context.active,
        controllers: context.controllers,
        onUploadFailure: context.onUploadFailure,
        setAttachments: context.setAttachments,
        upload: context.upload,
        uploadFailedError: context.uploadFailedError,
      },
      file,
    );
  };
  const removeAttachment = (localId: string): void => {
    context.attachments
      .find((attachment) => attachment.localId === localId)
      ?.abortHandle?.abort();
    context.setAttachments((previous) =>
      previous.filter((attachment) => attachment.localId !== localId),
    );
  };
  const clear = (): void => {
    context.setAttachments([]);
    context.setFileError(null);
  };
  const resetAttachments = (attachments: AttachmentUploadItem[]): void => {
    abortControllers(context.controllers);
    if (context.active.current) {
      context.setAttachments(attachments);
      context.setFileError(null);
    }
  };

  return { addFile, clear, removeAttachment, resetAttachments };
}

export function useAttachmentUploadLifecycle(
  options: Options,
): AttachmentUploadLifecycle {
  const [fileError, setFileError] = useState<string | null>(null);
  const controllersRef = useRef(new Map<string, AbortController>());
  const controllers = controllersRef.current;
  const activeRef = useUploadActivity(
    controllers,
    options.abortOnUnmount ?? false,
  );
  const actions = createAttachmentActions({
    ...options,
    active: activeRef,
    controllers,
    setFileError,
  });

  return {
    attachments: options.attachments,
    anyUploading: options.attachments.some(
      (attachment) => attachment.status === "uploading",
    ),
    fileError,
    ...actions,
  };
}
