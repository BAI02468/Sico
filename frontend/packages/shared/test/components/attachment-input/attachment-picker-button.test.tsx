import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AttachmentPickerButton } from "@/components/attachment-input";

describe("AttachmentPickerButton", () => {
  it("disables its trigger and file input", () => {
    render(<AttachmentPickerButton onAddFile={vi.fn()} disabled />);

    expect(
      screen.getByRole("button", { name: "Add attachment" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Attach a file")).toBeDisabled();
  });
});
