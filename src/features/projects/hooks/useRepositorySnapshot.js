import { useCallback, useEffect, useRef, useState } from "react";
import { repositorySnapshotService } from "../../../services/repositorySnapshotService.js";

const UNLINKED_RESULT = Object.freeze({
  status: "unlinked",
  source: null,
  snapshot: null,
  cache: null,
  error: null,
});

export function useRepositorySnapshot(repository) {
  const requestIdRef = useRef(0);
  const [state, setState] = useState({
    isLoading: Boolean(repository),
    result: repository ? null : UNLINKED_RESULT,
  });

  const load = useCallback(
    async (forceRefresh = false) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!repository) {
        setState({ isLoading: false, result: UNLINKED_RESULT });
        return UNLINKED_RESULT;
      }

      setState((current) => ({ ...current, isLoading: true }));

      let result;
      try {
        result = await repositorySnapshotService.read(repository, {
          forceRefresh,
        });
      } catch (error) {
        result = {
          status: "error",
          source: null,
          snapshot: null,
          cache: null,
          error: {
            code: "unexpected",
            message: error instanceof Error ? error.message : "Unexpected error",
          },
        };
      }

      if (requestIdRef.current === requestId) {
        setState({ isLoading: false, result });
      }

      return result;
    },
    [repository]
  );

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (!isCancelled) load(false);
    });

    return () => {
      isCancelled = true;
      requestIdRef.current += 1;
    };
  }, [load]);

  return {
    ...state,
    refresh: () => load(true),
  };
}
