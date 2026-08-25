import { type AxiosInstance } from "axios";
import { z } from "zod";

import { PROJECT_ENDPOINTS } from "../constants/endpoints";
import { HTTP_OK } from "../constants/http";
import { type CommonAttachment } from "../schemas/common-attachment";
import { uploadEnvelopeSchema } from "../schemas/upload-attachment";

// Eager single-file upload (domain, plain fn). Holds no state — the caller
// owns the AbortController and passes `signal`. Returns the ready asset ref or
// throws (envelope failure / non-OK code / missing data → upload-fail path).
export async function uploadAttachment(
  apiClient: AxiosInstance,
  file: File,
  signal: AbortSignal,
): Promise<CommonAttachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiClient.post<unknown>(PROJECT_ENDPOINTS.asset, form, {
    signal,
  });
  const parsed = uploadEnvelopeSchema.parse(res.data);
  if (parsed.code !== HTTP_OK || !parsed.data) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["data"],
        message: `uploadAttachment: upload rejected (code ${parsed.code})`,
      },
    ]);
  }
  const asset = parsed.data;
  return {
    name: asset.metaInfo.fileName,
    size: asset.metaInfo.fileSize,
    type: asset.metaInfo.fileType,
    uri: asset.uri,
    sasUrl: asset.sasUrl,
  };
}
