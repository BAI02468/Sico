import { z } from "zod";

import { commonAttachmentSchema } from "../../../schemas/common-attachment";

// Outbound send payload (backend `ChatV2Request`, dto/conversation/chat.go:
// `message` string + `agentInstanceId` int64, both binding:"required",
// `attachments []*Attachment`). `conversationId` targets a specific
// conversation (multi-conversation): the DW home mints one via
// `POST /conversation` and sends into it. OMITTED for sico (v1) — there the
// backend still derives the single conversation from (username, agentId,
// agentInstanceId) via ensureConversation (§7).
export const chatRequestSchema = z.object({
  agentInstanceId: z.number(),
  message: z.string(),
  attachments: z.array(commonAttachmentSchema),
  conversationId: z.number().optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
