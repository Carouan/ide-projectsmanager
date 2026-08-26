function createDisabledResult(projectDoc) {
  return {
    status: "disabled",
    project: projectDoc,
  };
}

function readSync(projectDoc) {
  return projectDoc?.sync || {};
}

function readProjectVersion(projectDoc) {
  const sync = readSync(projectDoc);
  return Number.isFinite(sync.localVersion) ? sync.localVersion : 0;
}

export function computeConflict({ localProject, remoteProject } = {}) {
  const localProjectId = localProject?.project?.id || null;
  const remoteProjectId = remoteProject?.project?.id || null;

  if (!remoteProject) {
    return {
      hasConflict: false,
      reason: "remote_missing",
      strategy: "local",
      winner: "local",
      localProjectId,
      remoteProjectId,
    };
  }

  if (localProjectId && remoteProjectId && localProjectId !== remoteProjectId) {
    return {
      hasConflict: true,
      reason: "project_mismatch",
      strategy: "manual",
      winner: null,
      localProjectId,
      remoteProjectId,
    };
  }

  const localSync = readSync(localProject);
  const remoteVersion = readProjectVersion(remoteProject);
  const remoteChangedSinceLastSync = remoteVersion > (localSync.remoteVersion || 0);
  const localDirty = localSync.dirty === true;

  if (localDirty && remoteChangedSinceLastSync) {
    return {
      hasConflict: true,
      reason: "both_changed",
      strategy: "manual",
      winner: null,
      localProjectId,
      remoteProjectId,
      localVersion: localSync.localVersion || 0,
      remoteVersion,
      baseRemoteVersion: localSync.remoteVersion || 0,
    };
  }

  if (remoteChangedSinceLastSync) {
    return {
      hasConflict: false,
      reason: "remote_newer",
      strategy: "lww",
      winner: "remote",
      localProjectId,
      remoteProjectId,
      remoteVersion,
      baseRemoteVersion: localSync.remoteVersion || 0,
    };
  }

  if (localDirty) {
    return {
      hasConflict: false,
      reason: "local_dirty",
      strategy: "lww",
      winner: "local",
      localProjectId,
      remoteProjectId,
    };
  }

  return {
    hasConflict: false,
    reason: "in_sync",
    strategy: "none",
    winner: "none",
    localProjectId,
    remoteProjectId,
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
