import type { FallbackProps } from "react-error-boundary";

import { CreateSetupBoundary } from "./create-setup-boundary";
import { ErrorView } from "../../../components/error-view";

export function CreateSetupErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): React.JSX.Element {
  return (
    <CreateSetupBoundary>
      <ErrorView error={error} resetErrorBoundary={resetErrorBoundary} />
    </CreateSetupBoundary>
  );
}
