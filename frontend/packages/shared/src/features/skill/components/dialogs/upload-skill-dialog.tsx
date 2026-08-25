import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@sico/ui";
import {
  type Dispatch,
  type ReactElement,
  type SetStateAction,
  useRef,
  useState,
} from "react";

import { SkillFileDropzone } from "./skill-file-dropzone";
import { SkillFileList } from "./skill-file-list";
import { UploadButtonContent } from "./upload-button-content";
import {
  MAX_SKILL_FILE_SIZE_MB,
  MAX_SKILL_FILES,
  MAX_UPDATE_FILES,
  SKILL_ACCEPT_EXTENSIONS,
} from "../../constants";
import { extOf } from "../../utils";

const MAX_BYTES = MAX_SKILL_FILE_SIZE_MB * 1024 * 1024;

// Imperative validation copy (方案 B): resolved at event time via `i18n._`, so
// these `msg()` descriptors carry no locale subscription — correct for a batch
// picked in an onChange handler rather than rendered.
const MAX_FILES_COPY = msg({
  id: "skill.uploadDialog.maxFiles",
  message:
    "{max, plural, one {You can upload up to # file.} other {You can upload up to # files.}}",
});
const INVALID_EXTENSION_COPY = msg({
  id: "skill.uploadDialog.invalidExtension",
  message: "Please select only .zip, .md, or .skill files.",
});
const FILE_TOO_LARGE_COPY = msg({
  id: "skill.uploadDialog.fileTooLarge",
  message: `File size exceeds the ${MAX_SKILL_FILE_SIZE_MB}MB limit. Please choose a smaller file.`,
});
const DUPLICATES_SKIPPED_COPY = msg({
  id: "skill.uploadDialog.duplicatesSkipped",
  message: "Duplicate files were skipped.",
});
const SUPPORT_CREATE_COPY = msg({
  id: "skill.uploadDialog.support.create",
  message: `Support: zip, md, skill, up to ${MAX_SKILL_FILE_SIZE_MB}MB, ${MAX_SKILL_FILES} files.`,
});
const SUPPORT_REPLACE_COPY = msg({
  id: "skill.uploadDialog.support.replace",
  message: `Support: zip, md, skill, up to ${MAX_SKILL_FILE_SIZE_MB}MB.`,
});

// Validate a freshly-picked batch against the remaining slots, allowed
// extensions, size limit, and existing selection. Toasts mirror legacy wording;
// returns the files that survive every filter (most-recent-first ordering is
// applied by the caller).
function pickValidFiles(picked: File[], existing: File[], max: number): File[] {
  const maxMsg = i18n._(MAX_FILES_COPY.id, { max }, MAX_FILES_COPY);
  const remain = max - existing.length;
  if (remain <= 0) {
    toast.info(maxMsg);
    return [];
  }

  const sliced = picked.slice(0, remain);
  const extOk = sliced.filter((file) =>
    SKILL_ACCEPT_EXTENSIONS.some((ext) => ext === extOf(file.name)),
  );
  if (extOk.length < sliced.length) {
    toast.error(i18n._(INVALID_EXTENSION_COPY));
  }

  const sized = extOk.filter((file) => file.size <= MAX_BYTES);
  if (sized.length < extOk.length) {
    toast.error(i18n._(FILE_TOO_LARGE_COPY));
  }

  const fresh = sized.filter(
    (file) =>
      !existing.some((e) => e.name === file.name && e.size === file.size),
  );
  if (fresh.length < sized.length) {
    toast.info(i18n._(DUPLICATES_SKIPPED_COPY));
  }
  if (picked.length > remain) {
    toast.info(maxMsg);
  }
  return fresh;
}

function uploadSupportText(mode: "create" | "replace"): string {
  const copy = mode === "create" ? SUPPORT_CREATE_COPY : SUPPORT_REPLACE_COPY;
  return i18n._(
    copy.id,
    { maxMb: MAX_SKILL_FILE_SIZE_MB, maxFiles: MAX_SKILL_FILES },
    copy,
  );
}

async function confirmUpload({
  files,
  onConfirm,
  setConfirming,
}: {
  files: File[];
  onConfirm: (files: File[]) => void | Promise<void>;
  setConfirming: Dispatch<SetStateAction<boolean>>;
}): Promise<void> {
  setConfirming(true);
  try {
    await onConfirm(files);
  } catch {
    // The caller owns network feedback. Contain the rejected event promise so
    // the dialog can keep its selection for retry and reset confirming below.
  } finally {
    setConfirming(false);
  }
}

// Upload dialog ported from legacy UploadSkillsDialog: pick up to `max` files,
// validate them client-side, list them with per-row remove, and hand the batch
// to `onConfirm`. The caller owns the network upload; `pending` drives the
// Uploading… state and locks the controls. `mode` switches between create (up
// to 5 files) and replace (1).
export function UploadSkillDialog({
  open,
  mode,
  pending = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  mode: "create" | "replace";
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (files: File[]) => void | Promise<void>;
}): ReactElement {
  const { t } = useLingui();
  const max = mode === "create" ? MAX_SKILL_FILES : MAX_UPDATE_FILES;
  const [files, setFiles] = useState<File[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFiles([]);
    }
  }

  const accept = SKILL_ACCEPT_EXTENSIONS.map((ext) => `.${ext}`).join(",");
  const supportText = uploadSupportText(mode);
  const dialogTitle =
    mode === "create"
      ? t({ id: "skill.uploadDialog.title.create", message: "Add skills" })
      : t({ id: "skill.uploadDialog.title.replace", message: "Replace skill" });

  const onPick = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(event.target.files ?? []);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (picked.length === 0) {
      return;
    }
    const fresh = pickValidFiles(picked, files, max);
    if (fresh.length > 0) {
      setFiles((prev) => [...fresh, ...prev]);
    }
  };

  const removeFile = (target: File): void => {
    setFiles((prev) => prev.filter((file) => file !== target));
  };
  const confirm = (): Promise<void> =>
    confirmUpload({ files, onConfirm, setConfirming });
  const busy = pending || confirming;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen || !busy) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-h-fit">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <SkillFileDropzone
            inputRef={inputRef}
            disabled={busy}
            multiple={max > 1}
            accept={accept}
            supportText={supportText}
            onPick={onPick}
          />

          {files.length > 0 && (
            <SkillFileList
              files={files}
              disabled={busy}
              onRemove={removeFile}
            />
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="subtle" disabled={busy} />}>
            {t({ id: "common.action.cancel", message: "Cancel" })}
          </DialogClose>
          <Button disabled={busy || files.length === 0} onClick={confirm}>
            <UploadButtonContent pending={busy} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
