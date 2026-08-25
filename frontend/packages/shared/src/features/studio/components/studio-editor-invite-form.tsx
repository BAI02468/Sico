import { useLingui } from "@lingui/react/macro";
import { Button, Input, Label } from "@sico/ui";
import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";

export function StudioEditorInviteForm({
  email,
  error,
  disabled,
  pending,
  onEmailChange,
  onSubmit,
}: {
  email: string;
  error: string | null;
  disabled: boolean;
  pending: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
}): React.JSX.Element {
  const { t } = useLingui();
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <>
      <form
        className="border-divider flex gap-2 border-b pb-4"
        noValidate
        onSubmit={submit}
      >
        <Label className="sr-only" htmlFor="studio-editor-email">
          {t({
            id: "studio.manageEditors.emailLabel",
            message: "Email address",
          })}
        </Label>
        <Input
          id="studio-editor-email"
          type="email"
          value={email}
          disabled={disabled}
          className="h-8 flex-1"
          placeholder={t({
            id: "studio.manageEditors.invitePlaceholder",
            message: "Invite editors with email",
          })}
          onChange={(event) => onEmailChange(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={disabled || email.trim().length === 0}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {t({ id: "studio.manageEditors.invite", message: "Invite" })}
        </Button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}
