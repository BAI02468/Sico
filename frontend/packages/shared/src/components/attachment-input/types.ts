import { type CommonAttachment } from "../../schemas/common-attachment";

export type AttachmentUploadItem =
  | {
      localId: string;
      file: File;
      status: "uploading";
      abortHandle: AbortController;
      assetRef?: undefined;
    }
  | {
      localId: string;
      file?: File;
      status: "ready";
      assetRef: CommonAttachment;
      abortHandle?: undefined;
    };
