import { useLingui } from "@lingui/react/macro";
import type { ChangeEvent, JSX, RefObject } from "react";

// The click-to-pick dropzone for the upload dialog: a large dashed button that
// proxies to a hidden file input, plus the support-text line. Extracted from
// UploadSkillDialog so that component stays under the line ceiling; its copy
// uses the hook `t` so lingui extracts it and it re-renders on a locale switch.
export function SkillFileDropzone({
  inputRef,
  disabled,
  multiple,
  accept,
  supportText,
  onPick,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  multiple: boolean;
  accept: string;
  supportText: string;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}): JSX.Element {
  const { t } = useLingui();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="border-divider text-foreground-secondary hover:text-foreground-primary flex h-24 w-full items-center justify-center rounded-lg border border-dashed text-sm transition-colors disabled:pointer-events-none disabled:opacity-60"
      >
        {t({
          id: "skill.uploadDialog.pickFiles",
          message: "Click to choose files",
        })}
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        aria-label={t({
          id: "skill.uploadDialog.filesAria",
          message: "Skill files",
        })}
        accept={accept}
        onChange={onPick}
      />
      <p className="text-foreground-faint text-sm">{supportText}</p>
    </>
  );
}
