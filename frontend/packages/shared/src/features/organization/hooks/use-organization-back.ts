import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";

function hasBack(history: unknown): history is { back: () => void } {
  return (
    typeof history === "object" &&
    history !== null &&
    "back" in history &&
    typeof history.back === "function"
  );
}

export function useOrganizationBack(): () => void {
  const router = useRouter();
  const history: unknown = router.history;
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  return () => {
    if (canGoBack && hasBack(history)) {
      history.back();
      return;
    }
    void navigate({ to: "/project" });
  };
}
