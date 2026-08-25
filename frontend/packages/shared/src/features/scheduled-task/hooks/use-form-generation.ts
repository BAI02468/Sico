import { useCallback, useRef, useState } from "react";

type FormGeneration = {
  generation: number;
  isCurrent: (generation: number) => boolean;
  start: () => void;
};

export function useFormGeneration(): FormGeneration {
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);
  const start = useCallback(() => {
    const nextGeneration = generationRef.current + 1;
    generationRef.current = nextGeneration;
    setGeneration(nextGeneration);
  }, []);
  const isCurrent = useCallback(
    (candidate: number): boolean => candidate === generationRef.current,
    [],
  );

  return { generation, isCurrent, start };
}
