import { type AxiosInstance } from "axios";

import { PROJECT_ENDPOINTS } from "../../../constants/endpoints";
import { unwrapData } from "../../../schemas/api";
import { type CommonAttachment } from "../../../schemas/common-attachment";
import { uploadEnvelopeSchema } from "../../../schemas/upload-attachment";
import {
  completeAssetUploadRequestSchema,
  createAssetUploadUrlEnvelopeSchema,
  createAssetUploadUrlRequestSchema,
} from "../schemas/upload";

export { uploadAttachment } from "../../../services/upload-attachment";

// Reject a step-1 upload URL that isn't http(s) before it reaches `fetch`. The
// backend mints this URL, but it's `z.string()` on the wire, so a poisoned
// response could smuggle a `file:`/`data:` scheme; the SAS token rides the query
// string, so `?` must be allowed (unlike a same-origin path guard).
function assertHttpUrl(url: string): string {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new Error("uploadProjectAssetDirect: malformed upload URL");
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error("uploadProjectAssetDirect: unsupported upload URL scheme");
  }
  return url;
}

// Step 2 of the direct upload: PUT the bytes straight to blob storage. A bare
// `fetch` (not `apiClient`) on purpose — the shared client would attach our
// Authorization header (Azure Blob 401s on it) and try to parse the empty PUT
// response as a {code,msg,data} envelope. `x-ms-blob-content-type` sets the
// stored blob's type; `...headers` carries any backend-required signed headers.
async function putBytesToBlob(
  target: {
    uploadUrl: string;
    method: string;
    headers: Record<string, string>;
  },
  file: File,
  contentType: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(assertHttpUrl(target.uploadUrl), {
    method: target.method || "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
      "x-ms-blob-content-type": contentType,
      ...target.headers,
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(
      `uploadProjectAssetDirect: blob PUT failed (${res.status})`,
    );
  }
}

// Direct-to-blob upload for large files (apks) that a plain multipart POST to
// `/project/asset` can't carry — the bytes would exceed the backend ingress
// body limit (→ 412). Mirrors legacy `uploadProjectAssetDirect`: mint a storage
// URL, PUT the bytes straight to blob storage (past the ingress), then register
// the asset. Returns the same ready `CommonAttachment` as `uploadAttachment`
// (the caller only needs `sasUrl`). `signal` cancels the long PUT.
export async function uploadProjectAssetDirect(
  apiClient: AxiosInstance,
  file: File,
  signal?: AbortSignal,
): Promise<CommonAttachment> {
  const contentType = file.type || "application/octet-stream";
  const meta = createAssetUploadUrlRequestSchema.parse({
    fileName: file.name,
    fileSize: file.size,
    contentType,
  });

  // Step 1: mint the short-lived storage URL.
  const createRes = await apiClient.post<unknown>(
    PROJECT_ENDPOINTS.assetUploadUrl,
    meta,
    {
      signal,
    },
  );
  const createParsed = createAssetUploadUrlEnvelopeSchema.parse(createRes.data);
  const { uploadUrl, objectKey, method, headers } = unwrapData(
    createParsed,
    "createAssetUploadUrl",
  );

  // Step 2: PUT the bytes directly to blob storage.
  await putBytesToBlob(
    { uploadUrl, method, headers },
    file,
    contentType,
    signal,
  );

  // Step 3: register the uploaded blob as an asset → get its `sasUrl`.
  const completeBody = completeAssetUploadRequestSchema.parse({
    objectKey,
    fileName: file.name,
    fileSize: file.size,
    contentType,
  });
  const completeRes = await apiClient.post<unknown>(
    PROJECT_ENDPOINTS.assetComplete,
    completeBody,
    { signal },
  );
  const completeParsed = uploadEnvelopeSchema.parse(completeRes.data);
  const asset = unwrapData(completeParsed, "completeAssetUpload");
  return {
    name: asset.metaInfo.fileName,
    size: asset.metaInfo.fileSize,
    type: asset.metaInfo.fileType,
    uri: asset.uri,
    sasUrl: asset.sasUrl,
  };
}
