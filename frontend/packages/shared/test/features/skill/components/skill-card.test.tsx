import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SkillSaveRegistryProvider,
  useSkillSaveRegistry,
} from "@/features/skill/components/setup/skill-save-registry";
import { SkillCard } from "@/features/skill/components/skill-list/skill-card";
import type { SkillFile } from "@/features/skill/schemas/skill";
import { SkillStatusSchema } from "@/features/skill/schemas/skill";

vi.mock("@/features/skill/components/file-explorer/code-viewer", () => ({
  CodeViewer: ({
    file,
    editable,
    onChange,
  }: {
    file: SkillFile;
    editable: boolean;
    onChange?: (content: string) => void;
  }): React.ReactElement =>
    editable ? (
      <textarea
        aria-label={`edit ${file.path}`}
        value={file.content}
        onChange={(event) => onChange?.(event.target.value)}
      />
    ) : (
      <div>{file.content}</div>
    ),
}));

const baseSkill = {
  id: 1,
  agentId: "a",
  name: "Visual Bot",
  description: "",
  version: "v1",
  status: 2,
  assetId: 1,
  creatorUsername: "max",
  failReason: "",
  projectId: 1,
  createdAt: 1,
  updatedAt: "2",
} as const;

const version = {
  id: 10,
  skillId: 1,
  version: "v1",
  name: "Visual Bot",
  description: "",
  assetId: 1,
  url: "",
  creatorUsername: "max",
  failReason: "",
  createdAt: 1,
  updatedAt: 2,
  files: [{ path: "skill.md", content: "# hi" }],
  actions: [{ name: "search", description: "d", advancedSettings: "" }],
};

function RegistryControls(): React.ReactElement {
  const { dirtyTargets } = useSkillSaveRegistry();
  const [failed, setFailed] = React.useState(false);
  const target = dirtyTargets[0];

  const saveTarget = async (): Promise<void> => {
    if (!target) {
      return;
    }
    try {
      await target.save("a");
    } catch {
      setFailed(true);
    }
  };

  return (
    <>
      <output aria-label="Dirty skill saves">{dirtyTargets.length}</output>
      <button type="button" onClick={saveTarget}>
        Run staged save
      </button>
      {failed && <p>Save failed</p>}
    </>
  );
}

function renderCard(
  overrides: Partial<React.ComponentProps<typeof SkillCard>> = {},
): React.ComponentProps<typeof SkillCard> {
  const props = {
    skill: baseSkill,
    versions: [version],
    status: SkillStatusSchema.enum.UPLOADED,
    detailLoading: false,
    originalFiles: version.files,
    filesLoading: false,
    selectedVersion: "v1",
    onSelectVersion: vi.fn(),
    onReplace: vi.fn(),
    onDownloadZip: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    expanded: false,
    onToggle: vi.fn(),
    editable: true,
    ...overrides,
  };
  render(
    <SkillSaveRegistryProvider>
      {React.createElement(StatefulCard, props)}
      <RegistryControls />
    </SkillSaveRegistryProvider>,
  );
  return props;
}

function StatefulCard(
  props: React.ComponentProps<typeof SkillCard>,
): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  return React.createElement(SkillCard, {
    ...props,
    expanded,
    onToggle: () => setExpanded((prev) => !prev),
  });
}

describe("SkillCard", () => {
  it("shows the parsing placeholder while uploading", () => {
    renderCard({ status: SkillStatusSchema.enum.UPLOADING });
    screen.getByText(/parsing skill content/i);
  });

  it("shows the parse-failed reason when failed", () => {
    renderCard({
      status: SkillStatusSchema.enum.FAILED,
      skill: { ...baseSkill, failReason: "bad zip" },
    });
    screen.getByText("bad zip");
  });

  it("renders Files and Tools tabs once expanded", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: /visual bot/i }));
    screen.getByRole("tab", { name: /files/i });
    screen.getByRole("tab", { name: /tools/i });
    expect(screen.getByLabelText(/edit skill\.md/i)).toHaveValue("# hi");
  });

  it("registers a dirty card and commits its baseline after save", async () => {
    const user = userEvent.setup();
    const props = renderCard();
    await user.click(screen.getByRole("button", { name: /visual bot/i }));
    await user.type(screen.getByLabelText(/edit skill\.md/i), "!");

    expect(screen.getByLabelText("Dirty skill saves")).toHaveTextContent("1");
    expect(
      screen.queryByRole("button", { name: "Actions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^save$/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run staged save" }));

    expect(props.onSave).toHaveBeenCalledWith(
      {
        files: [{ path: "skill.md", content: "# hi!" }],
        actions: undefined,
      },
      { showToast: false, currentVersion: "v1" },
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Dirty skill saves")).toHaveTextContent("0"),
    );
  });

  it("keeps a rejected card save dirty for retry", async () => {
    const user = userEvent.setup();
    const props = renderCard({
      onSave: vi.fn().mockRejectedValue(new Error("save failed")),
    });
    await user.click(screen.getByRole("button", { name: /visual bot/i }));
    await user.type(screen.getByLabelText(/edit skill\.md/i), "!");
    await user.click(screen.getByRole("button", { name: "Run staged save" }));

    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Save failed")).toBeVisible();
    expect(screen.getByLabelText("Dirty skill saves")).toHaveTextContent("1");
  });

  it("gates skill mutation actions when read-only", async () => {
    const user = userEvent.setup();
    const props = renderCard({ editable: false });

    await user.click(screen.getByRole("button", { name: /visual bot/i }));
    expect(screen.queryByLabelText(/edit skill\.md/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Replace" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    expect(props.onReplace).not.toHaveBeenCalled();
    expect(props.onDelete).not.toHaveBeenCalled();
  });
});
