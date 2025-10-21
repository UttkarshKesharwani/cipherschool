import { useEffect, useState, useMemo, useCallback } from "react";
import { projectsApi, filesApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import DEFAULT_FILES from "../lib/defaultFiles";

export default function useProject(initialProjectId = "default") {
  const { isAuthenticated, user } = useAuth();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activePath, setActivePath] = useState(Object.keys(DEFAULT_FILES)[0]);
  const [autosave, setAutosave] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Convert backend file structure to frontend format
  const convertBackendFiles = useCallback((backendFiles) => {
    const frontendFiles = {};

    if (Array.isArray(backendFiles)) {
      backendFiles.forEach((file) => {
        frontendFiles[file.path] = file.content;
      });
    }

    return Object.keys(frontendFiles).length > 0
      ? frontendFiles
      : DEFAULT_FILES;
  }, []);

  // Convert frontend files to backend format
  const convertFrontendFiles = useCallback((frontendFiles, projectIdValue) => {
    return Object.entries(frontendFiles).map(([path, content]) => ({
      path,
      content,
      projectId: projectIdValue,
      name: path.split("/").pop() || "untitled",
      type: getFileType(path),
    }));
  }, []);

  // Get file type from extension
  const getFileType = (path) => {
    const ext = path.split(".").pop()?.toLowerCase();
    const typeMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      css: "css",
      html: "html",
      json: "json",
      md: "markdown",
      txt: "text",
    };
    return typeMap[ext] || "text";
  };

  // Load project from backend or localStorage
  const loadProject = useCallback(
    async (projectIdValue = projectId) => {
      setIsLoading(true);
      setError(null);

      try {
        if (isAuthenticated && projectIdValue !== "default") {
          // Load from backend
          const projectResponse = await projectsApi.getById(projectIdValue);
          const filesResponse = await filesApi.getProjectTree(projectIdValue);

          setProject(projectResponse.data.project);
          const loadedFiles = convertBackendFiles(filesResponse.data.files);
          setFiles(loadedFiles);
          setActivePath(Object.keys(loadedFiles)[0] || "");
        } else {
          // Load from localStorage for guest mode or default project
          const key = `cipherstudio:${projectIdValue}`;
          const raw = localStorage.getItem(key);

          if (raw) {
            const parsed = JSON.parse(raw);
            setFiles(parsed.files || DEFAULT_FILES);
            setActivePath(
              parsed.activePath || Object.keys(parsed.files || DEFAULT_FILES)[0]
            );
          } else {
            setFiles(DEFAULT_FILES);
            setActivePath(Object.keys(DEFAULT_FILES)[0]);
          }
          setProject(null);
        }
      } catch (err) {
        console.error("Error loading project:", err);
        setError(err.message);

        // Fallback to localStorage or default files
        if (projectIdValue !== "default") {
          const key = `cipherstudio:${projectIdValue}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              setFiles(parsed.files || DEFAULT_FILES);
              setActivePath(
                parsed.activePath ||
                  Object.keys(parsed.files || DEFAULT_FILES)[0]
              );
            } catch {
              setFiles(DEFAULT_FILES);
              setActivePath(Object.keys(DEFAULT_FILES)[0]);
            }
          } else {
            setFiles(DEFAULT_FILES);
            setActivePath(Object.keys(DEFAULT_FILES)[0]);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, isAuthenticated, convertBackendFiles]
  );

  // Save project to backend or localStorage
  const saveProject = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      if (isAuthenticated && projectId !== "default") {
        const backendFiles = convertFrontendFiles(files, projectId);

        if (project) {
          // Update existing project
          await projectsApi.update(projectId, {
            files: backendFiles,
            lastModified: new Date().toISOString(),
          });
        } else {
          // Create new project
          const newProject = await projectsApi.create({
            name: projectId,
            description: `Project ${projectId}`,
            files: backendFiles,
          });
          setProject(newProject.data.project);
          setProjectId(newProject.data.project._id);
        }
      } else {
        // Save to localStorage for guest mode
        const key = `cipherstudio:${projectId}`;
        localStorage.setItem(key, JSON.stringify({ files, activePath }));
      }
    } catch (err) {
      console.error("Error saving project:", err);
      setError(err.message);

      // Fallback to localStorage
      const key = `cipherstudio:${projectId}`;
      localStorage.setItem(key, JSON.stringify({ files, activePath }));
    } finally {
      setIsSaving(false);
    }
  }, [
    files,
    activePath,
    projectId,
    project,
    isAuthenticated,
    isSaving,
    convertFrontendFiles,
  ]);

  // Create a new project
  const createProject = useCallback(
    async (name, description = "") => {
      if (!isAuthenticated) {
        // For guest mode, just switch to a new project ID
        const newId = `guest-${Date.now()}`;
        setProjectId(newId);
        setFiles(DEFAULT_FILES);
        setActivePath(Object.keys(DEFAULT_FILES)[0]);
        setProject(null);
        return { id: newId };
      }

      try {
        const newProject = await projectsApi.create({
          name,
          description,
          files: convertFrontendFiles(DEFAULT_FILES, null),
        });

        setProject(newProject.data.project);
        setProjectId(newProject.data.project._id);
        setFiles(DEFAULT_FILES);
        setActivePath(Object.keys(DEFAULT_FILES)[0]);

        return newProject.data.project;
      } catch (err) {
        console.error("Error creating project:", err);
        setError(err.message);
        throw err;
      }
    },
    [isAuthenticated, convertFrontendFiles]
  );

  // Load project when projectId changes
  useEffect(() => {
    loadProject(projectId);
  }, [projectId, loadProject]);

  // Auto-save functionality
  useEffect(() => {
    if (!autosave || projectId === "default") return;

    const timeoutId = setTimeout(() => {
      saveProject();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [files, activePath, autosave, projectId, saveProject]);

  // Convert files to Sandpack format
  const sandpackFiles = useMemo(() => {
    const out = {};
    Object.entries(files).forEach(([path, code]) => {
      let key = path.startsWith("/") ? path : `/${path}`;
      if (key.startsWith("/public/")) key = key.replace("/public/", "/");
      out[key] = { code };
    });
    return out;
  }, [files]);

  // File operations
  const updateFile = useCallback((path, content) => {
    setFiles((prev) => ({ ...prev, [path]: content }));
  }, []);

  const createFile = useCallback(
    async (path, content = `// new file ${path}\n`) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;

      if (files[normalizedPath]) {
        throw new Error("File already exists");
      }

      setFiles((prev) => ({ ...prev, [normalizedPath]: content }));
      setActivePath(normalizedPath);

      // If authenticated and not default project, create file in backend
      if (isAuthenticated && projectId !== "default" && project) {
        try {
          await filesApi.create({
            name: normalizedPath.split("/").pop(),
            path: normalizedPath,
            content,
            projectId: project._id,
            type: getFileType(normalizedPath),
          });
        } catch (err) {
          console.error("Error creating file in backend:", err);
          // File is already created locally, so continue
        }
      }
    },
    [files, isAuthenticated, projectId, project]
  );

  const deleteFile = useCallback(
    async (path) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const keysToDelete = Object.keys(files).filter(
        (k) => k === normalizedPath || k.startsWith(normalizedPath + "/")
      );

      if (keysToDelete.length === 0) return;

      setFiles((prev) => {
        const copy = { ...prev };
        keysToDelete.forEach((k) => delete copy[k]);
        return copy;
      });

      const remaining = Object.keys(files).filter(
        (k) => !keysToDelete.includes(k)
      );
      setActivePath(remaining[0] || "");

      // If authenticated and not default project, delete file in backend
      if (isAuthenticated && projectId !== "default" && project) {
        try {
          // Find and delete files by path
          const projectFiles = await filesApi.getProjectTree(project._id);
          const filesToDelete = projectFiles.data.files.filter((f) =>
            keysToDelete.includes(f.path)
          );

          await Promise.all(filesToDelete.map((f) => filesApi.delete(f._id)));
        } catch (err) {
          console.error("Error deleting file in backend:", err);
        }
      }
    },
    [files, isAuthenticated, projectId, project]
  );

  const renameFile = useCallback(
    async (oldPath, newPath) => {
      const oldNormalized = oldPath.startsWith("/") ? oldPath : `/${oldPath}`;
      const newNormalized = newPath.startsWith("/") ? newPath : `/${newPath}`;

      const keysToRename = Object.keys(files).filter(
        (k) => k === oldNormalized || k.startsWith(oldNormalized + "/")
      );

      if (keysToRename.length === 0) {
        throw new Error("File not found");
      }

      // Check for conflicts
      const conflicts = keysToRename
        .map((k) => {
          const suffix = k.slice(oldNormalized.length);
          return newNormalized + suffix;
        })
        .filter((target) => files[target]);

      if (conflicts.length) {
        throw new Error("Target file already exists");
      }

      setFiles((prev) => {
        const copy = { ...prev };
        keysToRename.forEach((k) => {
          const suffix = k.slice(oldNormalized.length);
          const target = newNormalized + suffix;
          copy[target] = copy[k];
          delete copy[k];
        });
        return copy;
      });

      if (
        activePath &&
        (activePath === oldNormalized ||
          activePath.startsWith(oldNormalized + "/"))
      ) {
        const newActive =
          newNormalized + activePath.slice(oldNormalized.length);
        setActivePath(newActive);
      }

      // If authenticated and not default project, rename file in backend
      if (isAuthenticated && projectId !== "default" && project) {
        try {
          const projectFiles = await filesApi.getProjectTree(project._id);
          const filesToRename = projectFiles.data.files.filter((f) =>
            keysToRename.includes(f.path)
          );

          await Promise.all(
            filesToRename.map((f) => {
              const suffix = f.path.slice(oldNormalized.length);
              const newFilePath = newNormalized + suffix;
              return filesApi.move(f._id, {
                path: newFilePath,
                name: newFilePath.split("/").pop(),
              });
            })
          );
        } catch (err) {
          console.error("Error renaming file in backend:", err);
        }
      }
    },
    [files, activePath, isAuthenticated, projectId, project]
  );

  return {
    // Project state
    project,
    projectId,
    setProjectId,

    // Files state
    files,
    setFiles,
    activePath,
    setActivePath,
    sandpackFiles,

    // Settings
    autosave,
    setAutosave,

    // Loading states
    isLoading,
    isSaving,
    error,

    // File operations
    updateFile,
    createFile,
    deleteFile,
    renameFile,

    // Project operations
    saveProject,
    loadProject,
    createProject,
  };
}
