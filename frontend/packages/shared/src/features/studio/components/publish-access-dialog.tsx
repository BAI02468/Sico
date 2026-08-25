import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sico/ui";
import { X } from "lucide-react";
import { type ReactElement, useState } from "react";

import { PublishAccessField } from "./publish-access-field";
import type { PublishAccess } from "../schemas/publish-single-agent";

export function PublishAccessDialog({
  open,
  pending,
  onOpenChange,
  onPublish,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (access: PublishAccess) => void;
}): ReactElement {
  const { t } = useLingui();
  const [access, setAccess] = useState<PublishAccess>("only_me");
  const close = (): void => {
    if (!pending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => next || close()}>
      <DialogContent
        variant="content"
        className="w-130 gap-4"
        showCloseButton={false}
      >
        <DialogHeader className="gap-2">
          <DialogTitle>
            {t({
              id: "studio.publishDialog.title",
              message: "Publish digital worker",
            })}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t({
              id: "studio.publishDialog.description",
              message:
                "Choose who can use this digital worker in Sico after it’s published.",
            })}
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          variant="subtle"
          size="icon-sm"
          className="absolute top-5 right-5"
          aria-label={t({ id: "common.action.close", message: "Close" })}
          disabled={pending}
          onClick={close}
        >
          <X aria-hidden />
        </Button>
        <PublishAccessField
          access={access}
          pending={pending}
          onChange={setAccess}
        />
        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="subtle"
            disabled={pending}
            onClick={close}
          >
            {t({ id: "common.action.cancel", message: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={pending}
            onClick={() => onPublish(access)}
          >
            {pending
              ? t({
                  id: "studio.publishDialog.publishing",
                  message: "Publishing…",
                })
              : t({
                  id: "studio.publishDialog.publish",
                  message: "Publish",
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
