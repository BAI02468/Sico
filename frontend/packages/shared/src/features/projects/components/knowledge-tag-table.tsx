import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sico/ui";
import { Ellipsis } from "lucide-react";
import type * as React from "react";

import type { KnowledgeTag } from "../schemas/knowledge-tag";

type KnowledgeTagTableProps = {
  knowledgeTags: KnowledgeTag[];
  onEdit: (knowledgeTag: KnowledgeTag) => void;
  onDelete: (knowledgeTag: KnowledgeTag) => void;
};

/** The knowledge-tags table. Promoted from a module render helper to a
 * component so its `aria-label` copy is extracted by the lingui macro and
 * re-renders on a runtime locale switch (`useLingui` hook `t`). */
// eslint-disable-next-line max-lines-per-function -- table markup with header, per-row cells, and an actions menu is inherently long
export function KnowledgeTagTable({
  knowledgeTags,
  onEdit,
  onDelete,
}: KnowledgeTagTableProps): React.JSX.Element {
  const { t } = useLingui();
  return (
    <Table>
      <TableHeader>
        <TableRow className="h-13">
          <TableHead className="h-13 px-6 text-sm">
            <Trans id="projects.knowledgeTagsContent.tableHeader.knowledgeTag">
              KNOWLEDGE TAG
            </Trans>
          </TableHead>
          <TableHead className="h-13 px-6 text-sm">
            <Trans id="projects.knowledgeTagsContent.tableHeader.description">
              DESCRIPTION
            </Trans>
          </TableHead>
          <TableHead className="h-13 px-6 text-right text-sm">
            <Trans id="projects.knowledgeTagsContent.tableHeader.actions">
              ACTIONS
            </Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {knowledgeTags.map((knowledgeTag) => (
          <TableRow key={knowledgeTag.id} className="h-16">
            <TableCell className="text-foreground-primary leading-body w-72 max-w-72 truncate px-6">
              {knowledgeTag.name}
            </TableCell>
            <TableCell className="text-foreground-primary leading-body px-6">
              {knowledgeTag.description}
            </TableCell>
            <TableCell className="px-6 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="subtle"
                      size="icon-sm"
                      aria-label={t({
                        id: "projects.knowledgeTagsContent.actions.ariaLabel",
                        message: "Knowledge tag actions",
                      })}
                    />
                  }
                >
                  <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(knowledgeTag)}>
                    <Trans id="projects.knowledgeTagsContent.actions.edit">
                      Edit
                    </Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(knowledgeTag)}>
                    <Trans id="projects.knowledgeTagsContent.actions.delete">
                      Delete
                    </Trans>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
