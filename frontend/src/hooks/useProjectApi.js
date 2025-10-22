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
  const [autosave, setAutosave] = useState(false); // Disabled by default to reduce performance issues
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const convertBackendFiles = useCallback((backendFiles) => {
    const frontendFiles = {};

    const traverseTree = (items) => {
      if (!Array.isArray(items)) return;

      items.forEach((item) => {
        if (item.type === "file" && item.path && item.content !== undefined) {
          const normalizedPath = item.path.startsWith("/")
            ? item.path
            : `/${item.path}`;
          frontendFiles[normalizedPath] = item.content;
        } else if (item.type === "folder" && item.children) {
          // Recursively process children
          traverseTree(item.children);
        }
      });
    };

    // Handle tree structure from backend
    if (Array.isArray(backendFiles)) {
      traverseTree(backendFiles);
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
      type: "file", // Backend expects "file" type
      language: getFileType(path), // Use language instead of type for file extension
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
        if (projectIdValue !== "default") {
          // Try to load from backend (works for both authenticated users and public projects)
          try {
            const projectResponse = await projectsApi.getById(projectIdValue);
            const filesResponse = await filesApi.getProjectTree(projectIdValue);

            setProject(projectResponse.data.project);
            const loadedFiles = convertBackendFiles(
              filesResponse.data.fileTree
            );

            setFiles(loadedFiles);
            const firstFilePath = Object.keys(loadedFiles)[0] || "";
            console.log("Setting active path to:", firstFilePath);
            setActivePath(firstFilePath);
            setHasUnsavedChanges(false); // Mark as saved since we just loaded
            return; // Successfully loaded from backend
          } catch (backendError) {
            console.log(
              "Backend loading failed, trying localStorage:",
              backendError
            );
            // Fall through to localStorage loading
          }
        }

        // Load from localStorage for guest mode, default project, or when backend fails
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
    [isAuthenticated, convertBackendFiles]
  );

  // Save project to backend or localStorage
  const saveProject = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      if (isAuthenticated && projectId !== "default" && project) {
        // For authenticated users with existing projects, use bulk update
        const backendFiles = convertFrontendFiles(files, projectId);

        console.log(
          `Saving ${backendFiles.length} files to backend via bulk update...`
        );
        console.log(
          "Files to save:",
          backendFiles.map((f) => f.path)
        );

        const result = await filesApi.bulkUpdate(projectId, backendFiles);
        console.log("Bulk update result:", result);
        console.log("Files saved to backend successfully");
      }

      // Always save to localStorage as backup
      const key = `cipherstudio:${projectId}`;
      localStorage.setItem(key, JSON.stringify({ files, activePath }));

      console.log("Project saved to localStorage");
    } catch (err) {
      console.error("Error saving project:", err);
      setError(err.message);

      // Fallback to localStorage
      const key = `cipherstudio:${projectId}`;
      localStorage.setItem(key, JSON.stringify({ files, activePath }));
    } finally {
      setIsSaving(false);
      setHasUnsavedChanges(false); // Clear unsaved changes flag after successful save
    }
  }, [
    files,
    activePath,
    projectId,
    project,
    isAuthenticated,
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
        // Create project first without files, then add files with correct projectId
        const newProject = await projectsApi.create({
          name,
          description,
          files: convertFrontendFiles(DEFAULT_FILES, "temp"), // Temp projectId, will be replaced in backend
        });

        const projectId = newProject.data.project._id;

        setProject(newProject.data.project);
        setProjectId(projectId);
        setFiles(DEFAULT_FILES);
        setActivePath(Object.keys(DEFAULT_FILES)[0]);
        setHasUnsavedChanges(false); // Mark as saved since we just created

        console.log(
          `Created new project: ${projectId} with ${
            Object.keys(DEFAULT_FILES).length
          } files`
        );
        return newProject.data.project;
      } catch (err) {
        console.error("Error creating project:", err);
        setError(err.message);
        throw err;
      }
    },
    [isAuthenticated, convertFrontendFiles]
  );

  // Load project when projectId changes (but not if we just created it)
  const [skipNextLoad, setSkipNextLoad] = useState(false);

  useEffect(() => {
    if (skipNextLoad) {
      setSkipNextLoad(false);
      return;
    }
    loadProject(projectId);
  }, [projectId]); // Remove loadProject from dependencies to prevent infinite loop

  // Auto-save functionality with debouncing and change detection
  useEffect(() => {
    if (!autosave || projectId === "default" || isSaving) return;

    // Debounce autosave - only save after 5 seconds of inactivity
    const timeoutId = setTimeout(() => {
      // Only save if there are actual changes (not just loading)
      if (Object.keys(files).length > 0 && !isLoading) {
        console.log("Auto-saving project...");
        saveProject();
      }
    }, 5000); // Increased to 5 seconds to reduce frequency

    return () => clearTimeout(timeoutId);
  }, [files, autosave, projectId, isSaving, isLoading]); // Removed activePath and saveProject to reduce triggers

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
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  }, []);

  const createFile = useCallback(
    async (path, content = `// new file ${path}\n`) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;

      if (files[normalizedPath]) {
        throw new Error("File already exists");
      }

      setFiles((prev) => ({ ...prev, [normalizedPath]: content }));
      setActivePath(normalizedPath);
      setHasUnsavedChanges(true); // Mark as having unsaved changes to trigger autosave

      console.log(`Created new file: ${normalizedPath}`);
    },
    [files]
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
    hasUnsavedChanges,

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
