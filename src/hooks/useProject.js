import { useEffect, useState, useMemo } from "react";
import DEFAULT_FILES from "../lib/defaultFiles";

export default function useProject(initialProjectId = "default") {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activePath, setActivePath] = useState(Object.keys(DEFAULT_FILES)[0]);
  const [autosave, setAutosave] = useState(true);

  useEffect(() => {
    const key = `cipherstudio:${projectId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.files) setFiles(parsed.files);
        if (parsed.activePath) setActivePath(parsed.activePath);
      } catch (e) {
        console.warn("failed to parse project", e);
      }
    }
  }, [projectId]);

  // debounced autosave
  useEffect(() => {
    if (!autosave) return;
    const id = setTimeout(() => {
      const key = `cipherstudio:${projectId}`;
      localStorage.setItem(key, JSON.stringify({ files, activePath }));
    }, 600);
    return () => clearTimeout(id);
  }, [files, activePath, autosave, projectId]);

  const sandpackFiles = useMemo(() => {
    const out = {};
    Object.entries(files).forEach(([path, code]) => {
      // Ensure Sandpack gets keys with a leading slash.
      let key = path.startsWith("/") ? path : `/${path}`;
      // Sandpack expects index.html at root as /index.html, not /public/index.html
      if (key.startsWith("/public/")) key = key.replace("/public/", "/");
      out[key] = { code };
    });
    return out;
  }, [files]);

  const updateFile = (path, content) =>
    setFiles((prev) => ({ ...prev, [path]: content }));

  function createFile(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    if (files[p]) throw new Error("exists");
    setFiles((prev) => ({ ...prev, [p]: `// new file ${p}\n` }));
    setActivePath(p);
  }

  function deleteFile(path) {
    // support deleting folders: if path is a folder (no extension) or prefix of other files,
    // delete all files that start with the given path as prefix.
    const p = path.startsWith("/") ? path : `/${path}`;
    const keysToDelete = Object.keys(files).filter(
      (k) => k === p || k.startsWith(p + "/")
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
  }

  function renameFile(oldPath, newPath) {
    const oldP = oldPath.startsWith("/") ? oldPath : `/${oldPath}`;
    const np = newPath.startsWith("/") ? newPath : `/${newPath}`;
    // if renaming a folder, rename all keys with the prefix
    const keysToRename = Object.keys(files).filter(
      (k) => k === oldP || k.startsWith(oldP + "/")
    );
    if (keysToRename.length === 0) throw new Error("not found");
    // check conflicts
    const conflicts = keysToRename
      .map((k) => {
        const suffix = k.slice(oldP.length);
        return np + suffix;
      })
      .filter((t) => files[t]);
    if (conflicts.length) throw new Error("target exists");
    setFiles((prev) => {
      const copy = { ...prev };
      keysToRename.forEach((k) => {
        const suffix = k.slice(oldP.length);
        const target = np + suffix;
        copy[target] = copy[k];
        delete copy[k];
      });
      return copy;
    });
    if (
      activePath &&
      (activePath === oldP || activePath.startsWith(oldP + "/"))
    ) {
      const newActive = np + activePath.slice(oldP.length);
      setActivePath(newActive);
    }
  }

  function saveProject() {
    const key = `cipherstudio:${projectId}`;
    localStorage.setItem(key, JSON.stringify({ files, activePath }));
  }

  function loadProject() {
    const key = `cipherstudio:${projectId}`;
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("not found");
    const parsed = JSON.parse(raw);
    if (parsed.files) setFiles(parsed.files);
    if (parsed.activePath) setActivePath(parsed.activePath);
  }

  return {
    projectId,
    setProjectId,
    files,
    setFiles,
    activePath,
    setActivePath,
    autosave,
    setAutosave,
    sandpackFiles,
    updateFile,
    createFile,
    deleteFile,
    renameFile,
    saveProject,
    loadProject,
  };
}
