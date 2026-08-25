import { useLingui } from "@lingui/react/macro";
import { InputGroupButton } from "@sico/ui";
import { Paperclip, Plus } from "lucide-react";
import { type ChangeEvent, type JSX, useRef } from "react";

type Props = {
  onAddFile: (file: File) => void;
  disabled?: boolean;
  icon?: "plus" | "paperclip";
};

// The composer's attach control: a circular `+` trigger wired to a hidden
// file input (Figma 19358:64589).
export function AttachmentPickerButton({
  onAddFile,
  disabled = false,
  icon = "plus",
}: Props): JSX.Element {
  const { t } = useLingui();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file && !disabled) {
      onAddFile(file);
    }
    // Reset so re-picking the same file fires `change` again.
    input.value = "";
  };

  return (
    <>
      <InputGroupButton
        size={icon === "paperclip" ? "icon-xs" : "icon-sm"}
        className={icon === "plus" ? "rounded-full" : undefined}
        aria-label={t({
          id: "chat.composerAttach.add",
          message: "Add attachment",
        })}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        {icon === "paperclip" ? <Paperclip /> : <Plus />}
      </InputGroupButton>
      <input
        ref={fileInputRef}
        type="file"
        aria-label={t({
          id: "chat.composerAttach.fileInput",
          message: "Attach a file",
        })}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />
    </>
  );
}
