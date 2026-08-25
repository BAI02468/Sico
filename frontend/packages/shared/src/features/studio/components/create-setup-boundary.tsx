import type { ReactNode } from "react";

import { StudioSetupHeader } from "./studio-setup-header";

export function CreateSetupBoundary({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <>
      <StudioSetupHeader
        editable={false}
        canPublish={false}
        showMoreActions={false}
        formId="studio-setup-form"
        saveDisabled
        onPublish={() => undefined}
      />
      <div className="scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="mx-auto flex min-h-full w-full max-w-230 flex-col gap-6 px-6 pt-2">
          {children}
        </div>
      </div>
    </>
  );
}
