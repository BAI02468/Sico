import { i18n } from "@lingui/core";
import { toast } from "@sico/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadSkillDialog } from "@/features/skill/components/dialogs/upload-skill-dialog";

const ZH_UPLOAD_MESSAGES = {
  "skill.uploadDialog.support.create":
    "支持格式：zip、md、skill；单个文件最大 {maxMb}MB，最多 {maxFiles} 个文件。",
};

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("UploadSkillDialog", () => {
  it("interpolates the create upload limits in a translated message", () => {
    i18n.loadAndActivate({ locale: "zh-CN", messages: ZH_UPLOAD_MESSAGES });

    render(
      <UploadSkillDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "支持格式：zip、md、skill；单个文件最大 10MB，最多 5 个文件。",
      ),
    ).toBeVisible();
  });

  it("rejects an unsupported extension and accepts a valid one", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <UploadSkillDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByLabelText("Skill files");

    await user.upload(
      input,
      new File(["x"], "notes.txt", { type: "text/plain" }),
    );
    expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();

    const md = new File(["# hi"], "skill.md", { type: "text/markdown" });
    await user.upload(input, md);
    const confirm = screen.getByRole("button", { name: /upload/i });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith([md]);
  });

  it("contains caller-owned upload failures without adding another toast", async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    const onConfirm = vi.fn().mockImplementation(async () => {
      toast.error("Failed to replace skill");
      throw new Error("upload failed");
    });
    render(
      <UploadSkillDialog
        open
        mode="replace"
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const file = new File(["# hi"], "skill.md", { type: "text/markdown" });

    await user.upload(screen.getByLabelText("Skill files"), file);
    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /upload/i })).toBeEnabled(),
    );
    expect(screen.getByText("skill.md")).toBeVisible();
    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith("Failed to replace skill");
  });
});
