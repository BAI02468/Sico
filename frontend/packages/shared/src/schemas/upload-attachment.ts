import { z } from "zod";

import { apiResponseSchema } from "./api";

// Inner payload of the asset-upload response (legacy `UploadAssetResponse`).
export const uploadAssetResponseSchema = z.object({
  id: z.number(),
  metaInfo: z.object({
    contentType: z.string(),
    fileExt: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    fileType: z.string(),
  }),
  sasUrl: z.string(),
  uri: z.string(),
});

// Carried inside the standard axios {code,msg,data} envelope.
export const uploadEnvelopeSchema = apiResponseSchema(
  uploadAssetResponseSchema,
);
