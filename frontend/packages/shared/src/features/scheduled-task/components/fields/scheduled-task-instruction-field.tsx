import { useLingui } from "@lingui/react/macro";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@sico/ui";
import { type ClipboardEvent, type JSX, type ReactNode } from "react";

import {
  AttachmentBar,
  AttachmentPickerButton,
  type AttachmentUploadItem,
} from "../../../../components/attachment-input";

type Props = {
  message: string;
  onMessageChange: (message: string) => void;
  attachments: AttachmentUploadItem[];
  onAddFile: (file: File) => void;
  onRemoveAttachment: (localId: string) => void;
  fileError?: string | null;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  actions?: ReactNode;
};

// The task form uses the Composer's visual language without inheriting its chat
// lifecycle, streaming state, or global attachment atom.
export function ScheduledTaskInstructionField({
  message,
  onMessageChange,
  attachments,
  onAddFile,
  onRemoveAttachment,
  fileError,
  id,
  invalid,
  disabled,
  required = false,
  actions,
}: Props): JSX.Element {
  const { t } = useLingui();
  const handleAddFile = (file: File): void => {
    if (!disabled) {
      onAddFile(file);
    }
  };
  const handleRemoveAttachment = (localId: string): void => {
    if (!disabled) {
      onRemoveAttachment(localId);
    }
  };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>): void => {
    const files = Array.from(event.clipboardData.files);
    if (disabled || files.length === 0) {
      return;
    }
    event.preventDefault();
    for (const file of files) {
      handleAddFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {fileError && (
        <p role="alert" className="text-status-error-foreground px-2 text-sm">
          {fileError}
        </p>
      )}
      <InputGroup
        aria-disabled={disabled}
        data-testid="scheduled-task-instruction-shell"
        inert={disabled}
        onPaste={handlePaste}
        className="bg-surface-basic min-h-48 rounded-lg pt-3 shadow-none"
      >
        <AttachmentBar
          attachments={attachments}
          onRemove={handleRemoveAttachment}
          disabled={disabled}
          allowRemotePreview={false}
        />
        <InputGroupTextarea
          id={id}
          aria-invalid={invalid ? true : undefined}
          placeholder={t({
            id: "scheduledTask.instruction.inputPlaceholder",
            message: "Describe what this task should do...",
          })}
          value={message}
          required={required}
          disabled={disabled}
          onChange={(event) => onMessageChange(event.target.value)}
          className="text-foreground-primary leading-body min-h-24 overflow-y-auto px-3 py-0 text-sm focus-visible:shadow-none!"
        />
        <InputGroupAddon
          align="block-end"
          className="mt-auto justify-start gap-1 px-3 pt-0 pb-1"
        >
          <AttachmentPickerButton
            onAddFile={handleAddFile}
            disabled={disabled}
            icon="paperclip"
          />
          {actions}
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
