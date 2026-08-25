import { Trans, useLingui } from "@lingui/react/macro";
import { Button, toast } from "@sico/ui";
import { useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useState } from "react";

import { EditKnowledgeTagDialog } from "./edit-knowledge-tag-dialog";
import { KnowledgeTagTable } from "./knowledge-tag-table";
import { KnowledgeTagsEmptyState } from "./knowledge-tags-empty-state";
import { ProjectPageHeader } from "./project-page-header";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { useKnowledgeTagMutation } from "../hooks/use-knowledge-tag-mutation";
import { useKnowledgeTagsQuery } from "../hooks/use-knowledge-tags-query";
import { useProjectDetailQuery } from "../hooks/use-project-query";
import type { KnowledgeTag } from "../schemas/knowledge-tag";

type EditingState = { open: boolean; knowledgeTag?: KnowledgeTag };

type KnowledgeTagsContentProps = {
  projectId: number;
};

/**
 * Suspending body — reads `useKnowledgeTagsQuery`, owns the Add/Edit dialog and
 * delete-confirm seams, and renders the table or empty state.
 */
// eslint-disable-next-line max-lines-per-function -- KnowledgeTagsContent manages dialog states and data mutations, making it inherently long
export function KnowledgeTagsContent({
  projectId,
}: KnowledgeTagsContentProps): React.JSX.Element {
  const { t } = useLingui();
  const { items: knowledgeTags } = useKnowledgeTagsQuery(projectId).data;
  const { data: project } = useProjectDetailQuery(projectId);
  const { remove } = useKnowledgeTagMutation(projectId);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<EditingState>({ open: false });
  const [deleting, setDeleting] = useState<KnowledgeTag | undefined>(undefined);

  const handleDelete = (): void => {
    if (!deleting) {
      return;
    }
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(
          t({
            id: "projects.knowledgeTagsContent.delete.success",
            message: "Knowledge tag deleted.",
          }),
          { invert: true },
        );
        setDeleting(undefined);
      },
      // Keep the confirm open on failure so the user can retry.
      onError: () => {
        toast.error(
          t({
            id: "projects.knowledgeTagsContent.delete.error",
            message: "We couldn't delete this knowledge tag. Try again.",
          }),
        );
      },
    });
  };

  // Knowledge tags is reached only from the workspace drawer's "View all".
  const handleBack = (): void => {
    void navigate({
      to: "/project/$projectId",
      params: { projectId: String(projectId) },
    });
  };

  return (
    <div className="bg-surface-canvas flex h-full min-h-0 flex-col">
      <ProjectPageHeader
        label={project.name}
        current={t({
          id: "projects.knowledgeTagsContent.header.current",
          message: "Knowledge Tags",
        })}
        onBack={handleBack}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-5 pt-11 pb-10 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <h1
            tabIndex={-1}
            className="text-foreground-primary text-3xl leading-tight font-medium outline-none"
          >
            <Trans id="projects.knowledgeTagsContent.title">
              Knowledge Tags
            </Trans>
          </h1>
          <Button
            variant="secondary"
            onClick={() => setEditing({ open: true })}
          >
            <Trans id="projects.knowledgeTagsContent.addButton">
              Add knowledge tag
            </Trans>
          </Button>
        </div>
        {knowledgeTags.length === 0 ? (
          <div className="bg-surface-basic shadow-m min-h-0 flex-1 rounded-2xl">
            <KnowledgeTagsEmptyState />
          </div>
        ) : (
          <div className="bg-surface-basic shadow-m min-h-0 flex-1 overflow-y-auto rounded-2xl">
            <KnowledgeTagTable
              knowledgeTags={knowledgeTags}
              onEdit={(knowledgeTag) =>
                setEditing({ open: true, knowledgeTag })
              }
              onDelete={setDeleting}
            />
          </div>
        )}
      </div>
      <EditKnowledgeTagDialog
        open={editing.open}
        onOpenChange={(open) => setEditing((prev) => ({ ...prev, open }))}
        projectId={projectId}
        knowledgeTag={editing.knowledgeTag}
      />
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => {
          // Lock the confirm while a delete is in flight so Esc / backdrop
          // can't dismiss it mid-request.
          if (!open && !remove.isPending) {
            setDeleting(undefined);
          }
        }}
        title={t({
          id: "projects.knowledgeTagsContent.confirmDelete.title",
          message: "Delete this knowledge tag?",
        })}
        body={t({
          id: "projects.knowledgeTagsContent.confirmDelete.body",
          message:
            "Assets tagged with it won't be deleted, but they'll lose this tag.",
        })}
        onConfirm={handleDelete}
        pending={remove.isPending}
      />
    </div>
  );
}
