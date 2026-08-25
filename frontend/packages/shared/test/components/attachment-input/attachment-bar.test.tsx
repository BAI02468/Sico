import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AttachmentBar,
  type AttachmentUploadItem,
} from "@/components/attachment-input";

function ready(localId: string, name: string): AttachmentUploadItem {
  return {
    localId,
    file: new File(["x"], name),
    status: "ready",
    assetRef: { name, size: 1, type: "txt", uri: `asset://${localId}` },
  };
}

describe("AttachmentBar", () => {
  it("renders one chip per attachment", () => {
    render(
      <AttachmentBar
        attachments={[ready("a", "one.pdf"), ready("b", "two.pdf")]}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
  });

  it("forwards disabled to every attachment control", () => {
    render(
      <AttachmentBar
        attachments={[ready("a", "one.pdf"), ready("b", "two.pdf")]}
        onRemove={vi.fn()}
        disabled
      />,
    );

    for (const button of screen.getAllByRole("button", {
      name: "Remove attachment",
    })) {
      expect(button).toBeDisabled();
    }
  });

  it("renders nothing when empty", () => {
    const { container } = render(
      <AttachmentBar attachments={[]} onRemove={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render server image previews when remote previews are disabled", () => {
    render(
      <AttachmentBar
        attachments={[
          {
            localId: "server-image",
            status: "ready",
            assetRef: {
              name: "pic.png",
              size: 1,
              type: "image/png",
              uri: "asset://server-image",
              sasUrl: "https://blob.example/pic.png?sig=abc",
            },
          },
        ]}
        onRemove={vi.fn()}
        allowRemotePreview={false}
      />,
    );
    expect(screen.getByText("pic.png")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "pic.png" })).toBeNull();
  });
});
