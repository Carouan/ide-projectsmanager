import { useCallback, useEffect, useRef, useState } from "react";
import { repositorySnapshotService } from "../../../services/repositorySnapshotService.js";

function unexpectedRepositoryResult(error) {
  return {
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

export async function readAttentionRepositoryResults(
  projects = [],
  { forceRefresh = false, repositoryService = repositorySnapshotService } = {}
) {
  const results = {};

  // Reads are intentionally sequential: cached entries resolve locally, while
  // uncached public GitHub reads avoid a burst that would waste the shared
  // unauthenticated API quota.
  for (const projectDoc of projects) {
    const projectId = projectDoc?.project?.id;
    if (!projectId || !projectDoc?.repository) continue;

    try {
      results[projectId] = await repositoryService.read(
        projectDoc.repository,
        { forceRefresh }
      );
    } catch (error) {
      results[projectId] = unexpectedRepositoryResult(error);
    }
  }

  return results;
}

export function useAttentionInbox(projects = []) {
  const requestIdRef = useRef(0);
  const [state, setState] = useState({
    isLoading: false,
    repositoryResults: {},
    refreshedAt: null,
  });

  const load = useCallback(
    async (forceRefresh = false, preserveResults = true) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setState((current) => ({
        ...current,
        isLoading: true,
        repositoryResults: preserveResults ? current.repositoryResults : {},
      }));

      const repositoryResults = await readAttentionRepositoryResults(projects, {
        forceRefresh,
      });

      if (requestIdRef.current === requestId) {
        setState({
          isLoading: false,
          repositoryResults,
          refreshedAt: new Date().toISOString(),
        });
      }

      return repositoryResults;
    },
    [projects]
  );

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (!isCancelled) load(false, false);
    });

    return () => {
      isCancelled = true;
      requestIdRef.current += 1;
    };
  }, [load]);

  return {
    ...state,
    refresh: () => load(true, true),
  };
}
