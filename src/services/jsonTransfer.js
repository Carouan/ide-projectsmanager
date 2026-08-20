export const PROJECT_BUNDLE_FORMAT = "ide-projectsmanager.project-bundle";
export const PROJECT_BUNDLE_VERSION = 1;

export function createProjectBundle(projects, options = {}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const exportedAt = options.exportedAt || new Date().toISOString();

  return {
    format: PROJECT_BUNDLE_FORMAT,
    version: PROJECT_BUNDLE_VERSION,
    exportedAt,
    projectCount: safeProjects.length,
    projects: safeProjects,
  };
}

export function downloadJsonFile(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(parsed);
      } catch (error) {
        reject(new Error("Le fichier JSON est invalide."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Impossible de lire le fichier."));
    };

    reader.readAsText(file, "utf-8");
  });
}
