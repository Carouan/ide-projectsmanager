function createDisabledResult(projectDoc) {
  return {
    status: "disabled",
    project: projectDoc,
  };
}

export function computeConflict({ localProject, remoteProject } = {}) {
  return {
    hasConflict: false,
    reason: "not_implemented",
    localProjectId: localProject?.project?.id || null,
    remoteProjectId: remoteProject?.project?.id || null,
  };
}

export async function pushProject(projectDoc) {
  return createDisabledResult(projectDoc);
}

export async function pullProject(projectDoc) {
  return createDisabledResult(projectDoc);
}

export async function syncProject(projectDoc) {
  const conflict = computeConflict({ localProject: projectDoc, remoteProject: null });

  return {
    status: "disabled",
    project: projectDoc,
    conflict,
  };
}
