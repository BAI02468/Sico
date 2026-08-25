import type { OpenChatStreamOptions } from "./chat-stream";
import { logger } from "../../../utils/logger";
import type { ChatRequest } from "../schemas/chat-request";

type OpenChatStream = (
  payload: ChatRequest,
  options: Omit<OpenChatStreamOptions, "url">,
) => Promise<void>;

export type SendMessageContext = {
  agentInstanceId: number;
  conversationId?: number;
  openChatStream: OpenChatStream;
  toastError: (message: string) => void;
  onOpen?: () => void;
  onSettle?: () => void;
  onTerminal?: () => void;
};

type CallbackName = "onOpen" | "onSettle" | "onTerminal" | "toastError";

type SendLifecycleCallbacks = Pick<
  SendMessageContext,
  "onOpen" | "onSettle" | "onTerminal" | "toastError"
>;

export type SendLifecycle = {
  open(): void;
  settle(): void;
  terminal(): void;
  toastError(message: string): void;
};

function invokeSafely(
  callback: (() => void) | undefined,
  name: CallbackName,
): void {
  try {
    callback?.();
  } catch {
    logger.error("chat: send lifecycle callback failed", { callback: name });
  }
}

export function createSendLifecycle({
  onOpen,
  onSettle,
  onTerminal,
  toastError,
}: SendLifecycleCallbacks): SendLifecycle {
  let didOpen = false;
  let didSettle = false;
  let didTerminate = false;

  return {
    open: () => {
      if (didOpen) {
        return;
      }
      didOpen = true;
      invokeSafely(onOpen, "onOpen");
    },
    settle: () => {
      if (didSettle) {
        return;
      }
      didSettle = true;
      invokeSafely(onSettle, "onSettle");
    },
    terminal: () => {
      if (didTerminate) {
        return;
      }
      didTerminate = true;
      invokeSafely(onTerminal, "onTerminal");
    },
    toastError: (message) => {
      invokeSafely(() => toastError(message), "toastError");
    },
  };
}
