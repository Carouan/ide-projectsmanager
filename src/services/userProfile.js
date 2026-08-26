function newUserId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `u_${crypto.randomUUID()}`;
  }

  return `u_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function createLocalUserProfile() {
  const now = new Date().toISOString();

  return {
    id: newUserId(),
    displayName: "Local User",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeUserProfile(profileDoc) {
  if (!profileDoc || typeof profileDoc !== "object") {
    return createLocalUserProfile();
  }

  const createdAt = profileDoc.createdAt || new Date().toISOString();

  return {
    id: profileDoc.id || newUserId(),
    displayName: profileDoc.displayName || "Local User",
    createdAt,
    updatedAt: profileDoc.updatedAt || createdAt,
  };
}
