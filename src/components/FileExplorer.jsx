import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";

// build a nested tree from array of paths (['/src/App.jsx', '/index.html'])
function buildTree(paths) {
  const root = {};
  paths.forEach((p) => {
    // normalize and strip leading slash
    const key = p.startsWith("/") ? p.slice(1) : p;
    const parts = key.split("/").filter(Boolean);
    // if this is a folder marker like 'foo/.keep' treat it as folder presence and don't create a leaf node for '.keep'
    const isKeepMarker =
      parts.length > 0 && parts[parts.length - 1] === ".keep";
    if (isKeepMarker) parts.pop();
    let node = root;
    parts.forEach((part, idx) => {
      // If this path originated from a .keep marker, ensure the final segment is treated as a folder (not a file)
      const isFile = !isKeepMarker && idx === parts.length - 1;
      if (!node[part]) node[part] = { __children: {}, __isFile: isFile };
      node = node[part].__children;
    });
  });
  return root;
}

function Icon({ isFile, open }) {
  // Files should not show any icon (user requested no icon for files).
  // Render an empty spacer for alignment.
  if (isFile) return <span className="fe-icon file-spacer" />;
  // VS Code-like chevrons: closed ▶, open ▼
  return (
    <span className={`fe-icon chevron ${open ? "open" : "closed"}`}>
      {open ? "v" : ">"}
    </span>
  );
}

function TreeNode({
  name,
  node,
  path,
  level,
  activePath,
  onSelectFile,
  onSelectFolder,
  onDelete,
  onCreateInFolder,
  onStartRename,
  renamingPath,
  renamingValue,
  setRenamingValue,
  onConfirmRename,
  onCancelRename,
  creatingPath,
  creatingType,
  creatingValue,
  setCreatingPath,
  setCreatingType,
  setCreatingValue,
  createFileInline,
  createFolderInline,
  focusedPath,
  setFocusedPath,
  focusNext,
  focusPrev,
  toggleFolderOpen,
  expandFolder,
  collapseFolder,
  openFolders,
  collapseSignal,
}) {
  const isFile = node.__isFile;
  // collapsed by default
  const [open, setOpen] = useState(false);
  const children = Object.keys(node.__children || {});
  const fullPath = path ? `${path}/${name}` : name; // without leading /
  const absolutePath = "/" + fullPath; // leading slash
  const inputRef = useRef(null);
  // collapse signal effect: if collapseSignal changes, close local open
  useEffect(() => {
    if (typeof collapseSignal !== "undefined") setOpen(false);
  }, [collapseSignal]);

  useEffect(() => {
    if (renamingPath === absolutePath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingPath, absolutePath]);

  // auto-focus inline creating input
  useEffect(() => {
    if (creatingPath === absolutePath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [creatingPath, absolutePath]);

  return (
    <div
      className={`fe-node ${activePath === absolutePath ? "active" : ""}`}
      style={{ paddingLeft: level * 12 }}
    >
      <div className="fe-row">
        <div
          className="fe-label"
          tabIndex={0}
          role="button"
          onClick={() => {
            if (isFile) onSelectFile(absolutePath);
            else {
              // select the folder and toggle open
              onSelectFolder(absolutePath);
              setOpen((s) => !s);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (isFile) onSelectFile(absolutePath);
              else {
                onSelectFolder(absolutePath);
                // toggle using centralized open state if available
                if (typeof toggleFolderOpen === "function")
                  toggleFolderOpen(absolutePath);
                else setOpen((s) => !s);
              }
            } else if (e.key === "F2") {
              onStartRename(absolutePath, name);
            } else if (e.key === "Delete") {
              onDelete(absolutePath);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              if (typeof focusNext === "function") focusNext();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (typeof focusPrev === "function") focusPrev();
            } else if (e.key === "ArrowRight") {
              // expand folder
              if (!isFile && typeof expandFolder === "function")
                expandFolder(absolutePath);
            } else if (e.key === "ArrowLeft") {
              // collapse folder
              if (!isFile && typeof collapseFolder === "function")
                collapseFolder(absolutePath);
            }
          }}
        >
          <Icon isFile={isFile} open={open} />{" "}
          <span className="fe-name">{name}</span>
        </div>

        <div className="fe-actions">
          {/* actions removed for a cleaner explorer UI; use header buttons or context menu */}
        </div>
      </div>

      {!isFile && (open || openFolders?.has(absolutePath)) && (
        <div className="fe-children">
          {children
            .sort((a, b) => {
              const aNode = node.__children[a];
              const bNode = node.__children[b];
              const aIsFile = !!(aNode && aNode.__isFile);
              const bIsFile = !!(bNode && bNode.__isFile);
              if (aIsFile === bIsFile) return a.localeCompare(b);
              return aIsFile ? 1 : -1;
            })
            .map((child) => (
              <TreeNode
                key={child}
                name={child}
                node={node.__children[child]}
                path={fullPath}
                level={level + 1}
                activePath={activePath}
                onSelectFile={onSelectFile}
                onSelectFolder={onSelectFolder}
                onDelete={onDelete}
                onCreateInFolder={onCreateInFolder}
                onStartRename={onStartRename}
                renamingPath={renamingPath}
                renamingValue={renamingValue}
                setRenamingValue={setRenamingValue}
                onConfirmRename={onConfirmRename}
                onCancelRename={onCancelRename}
                creatingPath={creatingPath}
                creatingType={creatingType}
                creatingValue={creatingValue}
                setCreatingPath={setCreatingPath}
                setCreatingType={setCreatingType}
                setCreatingValue={setCreatingValue}
                createFileInline={createFileInline}
                createFolderInline={createFolderInline}
                focusedPath={focusedPath}
                setFocusedPath={setFocusedPath}
                focusNext={focusNext}
                focusPrev={focusPrev}
                toggleFolderOpen={toggleFolderOpen}
                expandFolder={expandFolder}
                collapseFolder={collapseFolder}
                openFolders={openFolders}
                collapseSignal={collapseSignal}
              />
            ))}
        </div>
      )}

      {/* inline create input when creatingPath matches this folder */}
      {!isFile && creatingPath === absolutePath && (
        <div className="fe-rename" style={{ paddingLeft: (level + 1) * 12 }}>
          <input
            ref={inputRef}
            value={creatingValue}
            onChange={(e) => setCreatingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (creatingType === "file")
                  createFileInline(absolutePath, creatingValue);
                else createFolderInline(absolutePath, creatingValue);
              } else if (e.key === "Escape") {
                setCreatingPath(null);
                setCreatingType(null);
                setCreatingValue("");
              }
            }}
            onBlur={() => {
              // cancel on blur
              setCreatingPath(null);
              setCreatingType(null);
              setCreatingValue("");
            }}
          />
        </div>
      )}

      {renamingPath === absolutePath && (
        <div className="fe-rename" style={{ paddingLeft: (level + 1) * 12 }}>
          <input
            ref={inputRef}
            value={renamingValue}
            onChange={(e) => setRenamingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirmRename(absolutePath, e.target.value);
              } else if (e.key === "Escape") {
                onCancelRename();
              }
            }}
            onBlur={() => onCancelRename()}
          />
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  files,
  activePath,
  setActivePath,
  deleteFile,
  createFile,
  renameFile,
  onRefresh,
}) {
  const paths = useMemo(() => Object.keys(files), [files]);
  const tree = useMemo(() => buildTree(paths), [paths]);

  const [renamingPath, setRenamingPath] = useState(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [creatingPath, setCreatingPath] = useState(null);
  const [creatingType, setCreatingType] = useState(null); // 'file' | 'folder'
  const [creatingValue, setCreatingValue] = useState("");
  const [collapseSignal, setCollapseSignal] = useState(0);

  const handleSelect = useCallback(
    (p) => {
      const pp = p.startsWith("/") ? p : "/" + p;
      if (!files[pp]) {
        createFile(pp);
      }
      setActivePath(pp);
    },
    [files, createFile, setActivePath]
  );

  const handleSelectFolder = useCallback((p) => {
    setSelectedFolder(p);
    // if user selects folder we don't change activePath (only on file select)
  }, []);

  const isFolderPath = useCallback(
    (p) => {
      if (!p) return false;
      const normalized = p.startsWith("/") ? p : "/" + p;
      // a folder exists if any file starts with the folder prefix + '/'
      return Object.keys(files).some((k) => k.startsWith(normalized + "/"));
    },
    [files]
  );

  const getTargetFolder = useCallback(() => {
    // prefer selectedFolder when it points to a folder
    if (selectedFolder && isFolderPath(selectedFolder)) return selectedFolder;
    // if activePath is a file, use its parent folder
    if (activePath) {
      const parts = activePath.split("/");
      if (parts.length > 2) {
        parts.pop();
        return parts.join("/") || "/";
      }
      // if activePath is like '/file' (no parent), return root
      return "/";
    }
    return "/";
  }, [selectedFolder, isFolderPath, activePath]);

  const handleDelete = useCallback(
    (p) => {
      if (!p) return;
      // compute what will be deleted (files + nested)
      const normalized = p.startsWith("/") ? p : "/" + p;
      const toRemove = Object.keys(files).filter(
        (k) => k === normalized || k.startsWith(normalized + "/")
      );
      const msg =
        toRemove.length > 1
          ? `Delete ${toRemove.length} items under ${normalized}?`
          : `Delete ${normalized}?`;
      if (confirm(msg)) deleteFile(normalized);
    },
    [deleteFile, files]
  );

  const handleCreateInFolder = useCallback(
    (folderPath) => {
      // default name (file)
      const base = folderPath.endsWith("/") ? folderPath : folderPath + "/";
      const suggested = base + "NewFile.jsx";
      const name = prompt("Create file inside folder", suggested) || suggested;
      const normalized = name.startsWith("/") ? name : name;
      createFile(normalized);
    },
    [createFile]
  );

  const createFolder = useCallback(
    (folderPath) => {
      const base = folderPath.endsWith("/") ? folderPath : folderPath + "/";
      const suggested = base + "new-folder";
      const name = prompt("Create folder inside", suggested) || suggested;
      const normalized = name.startsWith("/") ? name : name;
      // create a placeholder file to ensure folder exists in model
      const marker = normalized.endsWith("/")
        ? normalized + ".keep"
        : normalized + "/.keep";
      createFile(marker);
    },
    [createFile]
  );

  const handleStartRename = useCallback((p, currentName) => {
    setRenamingPath(p);
    setRenamingValue(currentName);
  }, []);

  const handleConfirmRename = useCallback(
    (oldP, newName) => {
      if (!oldP) return;
      const parts = oldP.split("/");
      parts.pop(); // remove old name
      const newPath = parts.concat([newName]).join("/");
      const normalized = newPath.startsWith("/") ? newPath : "/" + newPath;
      renameFile(oldP, normalized);
      setRenamingPath(null);
      setRenamingValue("");
    },
    [renameFile]
  );

  const handleCancelRename = useCallback(() => {
    setRenamingPath(null);
    setRenamingValue("");
  }, []);

  return (
    <aside className="file-explorer vscode-like">
      <div className="fe-header">
        <span>Explorer</span>
        <div className="fe-header-actions">
          <button
            className="icon-btn"
            title="New File"
            aria-label="New File"
            onClick={() => {
              const target = getTargetFolder();
              setCreatingPath(target === "/" ? "/" : target);
              setCreatingType("file");
              setCreatingValue("NewFile.jsx");
            }}
          >
            {/* new file icon (document + plus) */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 2v6h6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 11v6M9 14h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="icon-btn"
            title="New Folder"
            aria-label="New Folder"
            onClick={() => {
              const target = getTargetFolder();
              setCreatingPath(target === "/" ? "/" : target);
              setCreatingType("folder");
              setCreatingValue("new-folder");
            }}
          >
            {/* new folder icon (folder + plus) */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 11v6M9 14h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="icon-btn"
            title="Refresh"
            onClick={() => {
              if (typeof onRefresh === "function") onRefresh();
            }}
          >
            {/* refresh icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 12a9 9 0 10-2.53 6.06"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12v6h-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="icon-btn"
            title="Collapse All"
            onClick={() => {
              // increment collapse signal to notify all nodes
              setCollapseSignal((s) => s + 1);
              // deselect folder
              setSelectedFolder("");
            }}
          >
            {/* collapse icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="fe-tree">
        {Object.keys(tree)
          .sort((a, b) => {
            const aIsFile = !!tree[a].__isFile;
            const bIsFile = !!tree[b].__isFile;
            if (aIsFile === bIsFile) return a.localeCompare(b);
            return aIsFile ? 1 : -1; // folders (isFile=false) come first
          })
          .map((key) => (
            <TreeNode
              key={key}
              name={key}
              node={tree[key]}
              path=""
              level={0}
              activePath={activePath}
              onSelectFile={handleSelect}
              onSelectFolder={handleSelectFolder}
              onDelete={handleDelete}
              onCreateInFolder={handleCreateInFolder}
              onStartRename={handleStartRename}
              renamingPath={renamingPath}
              renamingValue={renamingValue}
              setRenamingValue={setRenamingValue}
              onConfirmRename={handleConfirmRename}
              onCancelRename={handleCancelRename}
              creatingPath={creatingPath}
              creatingType={creatingType}
              creatingValue={creatingValue}
              setCreatingPath={setCreatingPath}
              setCreatingType={setCreatingType}
              setCreatingValue={setCreatingValue}
              createFileInline={(folder, name) => {
                const normalized = name.startsWith("/")
                  ? name
                  : folder === "/"
                  ? "/" + name
                  : folder + "/" + name;
                createFile(normalized);
                setCreatingPath(null);
                setCreatingType(null);
                setCreatingValue("");
                setActivePath(normalized);
              }}
              createFolderInline={(folder, name) => {
                const normalized = name.startsWith("/")
                  ? name
                  : folder === "/"
                  ? "/" + name
                  : folder + "/" + name;
                const marker = normalized.endsWith("/")
                  ? normalized + ".keep"
                  : normalized + "/.keep";
                createFile(marker);
                setCreatingPath(null);
                setCreatingType(null);
                setCreatingValue("");
              }}
              collapseSignal={collapseSignal}
            />
          ))}
      </div>
    </aside>
  );
}
