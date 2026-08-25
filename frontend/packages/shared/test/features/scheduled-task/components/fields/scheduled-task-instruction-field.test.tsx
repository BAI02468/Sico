import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type JSX, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { type AttachmentUploadItem } from "@/components/attachment-input";
import { ScheduledTaskInstructionField } from "@/features/scheduled-task/components/fields/scheduled-task-instruction-field";

function readyAttachment(): AttachmentUploadItem {
  return {
    localId: "ready",
    status: "ready",
    assetRef: {
      name: "existing.pdf",
      size: 1,
      type: "application/pdf",
      uri: "asset://existing",
    },
  };
}

function ControlledInstructionField({
  onMessageChange,
}: {
  onMessageChange: (message: string) => void;
}): JSX.Element {
  const [message, setMessage] = useState("");
  const handleMessageChange = (nextMessage: string): void => {
    setMessage(nextMessage);
    onMessageChange(nextMessage);
  };

  return (
    <ScheduledTaskInstructionField
      message={message}
      onMessageChange={handleMessageChange}
      attachments={[]}
      onAddFile={vi.fn()}
      onRemoveAttachment={vi.fn()}
    />
  );
}

describe("ScheduledTaskInstructionField", () => {
  it("forwards controlled instruction typing", async () => {
    const onMessageChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledInstructionField onMessageChange={onMessageChange} />);

    await user.type(screen.getByRole("textbox"), "Run the report");

    expect(onMessageChange).toHaveBeenLastCalledWith("Run the report");
  });

  it("sends a picked file to the attachment callback", async () => {
    const onAddFile = vi.fn();
    const user = userEvent.setup();
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[]}
        onAddFile={onAddFile}
        onRemoveAttachment={vi.fn()}
      />,
    );
    const picked = new File(["x"], "picked.pdf", { type: "application/pdf" });

    await user.upload(screen.getByLabelText("Attach a file"), picked);

    expect(onAddFile).toHaveBeenCalledWith(picked);
  });

  it("disables the attachment controls while disabled", async () => {
    const onAddFile = vi.fn();
    const onRemoveAttachment = vi.fn();
    const user = userEvent.setup();
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[readyAttachment()]}
        onAddFile={onAddFile}
        onRemoveAttachment={onRemoveAttachment}
        disabled
      />,
    );
    const picker = screen.getByRole("button", { name: "Add attachment" });
    const input = screen.getByLabelText("Attach a file");
    const remove = screen.getByRole("button", { name: "Remove attachment" });

    expect(picker).toBeDisabled();
    expect(input).toBeDisabled();
    expect(remove).toBeDisabled();
    await user.click(remove);
    await user.upload(
      input,
      new File(["x"], "disabled.pdf", { type: "application/pdf" }),
    );

    expect(onAddFile).not.toHaveBeenCalled();
    expect(onRemoveAttachment).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("scheduled-task-instruction-shell"),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByTestId("scheduled-task-instruction-shell"),
    ).toHaveAttribute("inert");
  });

  it("routes pasted files through the attachment callback", () => {
    const onAddFile = vi.fn();
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[]}
        onAddFile={onAddFile}
        onRemoveAttachment={vi.fn()}
      />,
    );
    const pasted = new File(["x"], "pasted.pdf", { type: "application/pdf" });
    const instruction = screen.getByRole("textbox");

    fireEvent.paste(instruction, { clipboardData: { files: [pasted] } });

    expect(onAddFile).toHaveBeenCalledWith(pasted);
  });

  it("lets text paste fall through without adding an attachment", () => {
    const onAddFile = vi.fn();
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[]}
        onAddFile={onAddFile}
        onRemoveAttachment={vi.fn()}
      />,
    );
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { files: [] } });

    screen.getByRole("textbox").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onAddFile).not.toHaveBeenCalled();
  });

  it("renders attachments and Composer semantic shell classes", () => {
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[readyAttachment()]}
        onAddFile={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );

    expect(screen.getByText("existing.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("scheduled-task-instruction-shell")).toHaveClass(
      "bg-surface-basic",
      "border-input-stroke-rest",
      "min-h-48",
      "rounded-lg",
      "shadow-none",
    );
    expect(screen.getByRole("textbox")).toHaveClass("text-sm");
    expect(
      screen
        .getByRole("button", { name: "Add attachment" })
        .querySelector("svg"),
    ).toHaveClass("lucide-paperclip");
  });

  it("lets the instruction shell grow when attachments need more than 192px", () => {
    render(
      <ScheduledTaskInstructionField
        message="Test"
        onMessageChange={vi.fn()}
        attachments={[readyAttachment()]}
        onAddFile={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );

    expect(screen.getByTestId("scheduled-task-instruction-shell")).toHaveClass(
      "min-h-48",
    );
    expect(
      screen.getByTestId("scheduled-task-instruction-shell"),
    ).not.toHaveClass("has-[>[data-align=block-end]]:h-48");
    expect(
      screen.getByRole("button", { name: "Add attachment" }),
    ).toBeVisible();
  });

  it("renders persisted server images without a remote preview", () => {
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[
          {
            localId: "server-image",
            status: "ready",
            assetRef: {
              name: "existing.png",
              size: 1,
              type: "image/png",
              uri: "asset://existing-image",
              sasUrl: "https://blob.example/existing.png?sig=abc",
            },
          },
        ]}
        onAddFile={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );

    expect(screen.getByText("existing.png")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "existing.png" })).toBeNull();
  });

  it("uses the semantic error foreground for file errors", () => {
    render(
      <ScheduledTaskInstructionField
        message=""
        onMessageChange={vi.fn()}
        attachments={[]}
        onAddFile={vi.fn()}
        onRemoveAttachment={vi.fn()}
        fileError="File upload failed"
      />,
    );

    expect(screen.getByRole("alert")).toHaveClass(
      "text-status-error-foreground",
    );
  });
});
