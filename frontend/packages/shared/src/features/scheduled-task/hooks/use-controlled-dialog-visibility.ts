import { useCallback, useEffect, useRef, useState } from "react";

type ControlledDialogVisibility = {
  cancelParentClose: () => void;
  close: () => void;
  isVisible: boolean;
};

type ControlledDialogVisibilityOptions = {
  closeBlocked: boolean;
  isDirty: boolean;
  onDirtyClose: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reset: () => void;
};

export function useControlledDialogVisibility({
  closeBlocked,
  isDirty,
  onDirtyClose,
  onOpenChange,
  open,
  reset,
}: ControlledDialogVisibilityOptions): ControlledDialogVisibility {
  const [isVisible, setIsVisible] = useState(open);
  const wasOpen = useRef(open);
  const shouldRestoreParent = useRef(false);
  const preserveOnNextOpen = useRef(false);
  const close = useCallback(() => {
    shouldRestoreParent.current = false;
    preserveOnNextOpen.current = false;
    reset();
    setIsVisible(false);
    onOpenChange(false);
  }, [onOpenChange, reset]);
  const cancelParentClose = useCallback(() => {
    if (shouldRestoreParent.current) {
      shouldRestoreParent.current = false;
      preserveOnNextOpen.current = true;
      onOpenChange(true);
    }
  }, [onOpenChange]);
  useEffect(() => {
    if (open && !wasOpen.current) {
      if (!preserveOnNextOpen.current) {
        reset();
      }
      preserveOnNextOpen.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors external controlled open state.
      setIsVisible(true);
    } else if (!open && wasOpen.current) {
      if (closeBlocked) {
        preserveOnNextOpen.current = true;
        onOpenChange(true);
      } else if (isDirty) {
        shouldRestoreParent.current = true;
        onDirtyClose();
      } else {
        reset();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors external controlled open state.
        setIsVisible(false);
      }
    }
    wasOpen.current = open;
  }, [closeBlocked, isDirty, onDirtyClose, onOpenChange, open, reset]);
  return { cancelParentClose, close, isVisible };
}
