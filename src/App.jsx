import React, { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

import { AuthProvider } from "./contexts/AuthContext";
import FileExplorer from "./components/FileExplorer";
import TopBar from "./components/TopBar";
import MonacoEditor from "./components/MonacoEditor";
import useProjectApi from "./hooks/useProjectApi";
import "./newStyles.css";

function AppContent() {
  const project = useProjectApi("default");
  const {
    files,
    activePath,
    sandpackFiles,
    updateFile,
    createFile,
    deleteFile,
    renameFile,
    projectId,
    setProjectId,
    autosave,
    setAutosave,
    saveProject,
    loadProject,
    createProject,
    setActivePath,
    isSaving,
    isLoading,
    error,
  } = project;

  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const handleCreateProject = async (name, description = "") => {
    try {
      const newProject = await createProject(name, description);
      console.log("Project created:", newProject);
    } catch (err) {
      alert("Failed to create project: " + err.message);
    }
  };

  const handleAddFile = () => {
    const path = prompt("Enter new file path", "/src/NewFile.jsx");
    if (path) {
      try {
        createFile(path);
      } catch (err) {
        alert("Failed to create file: " + err.message);
      }
    }
  };

  const handleSave = async () => {
    try {
      await saveProject();
      console.log("Project saved successfully");
    } catch (err) {
      alert("Failed to save project: " + err.message);
    }
  };

  const handleLoad = async () => {
    try {
      await loadProject();
      console.log("Project loaded successfully");
    } catch (err) {
      alert("Failed to load project: " + err.message);
    }
  };

  return (
    <div className={`app-root ${theme}`}>
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      <TopBar
        projectId={projectId}
        setProjectId={setProjectId}
        onSave={handleSave}
        onLoad={handleLoad}
        onCreateProject={handleCreateProject}
        autosave={autosave}
        setAutosave={setAutosave}
        onAddFile={handleAddFile}
        theme={theme}
        setTheme={setTheme}
        isSaving={isSaving}
        isLoading={isLoading}
      />

      <SandpackProvider
        files={sandpackFiles}
        customSetup={{
          entry: "/src/index.jsx",
          dependencies: { react: "18.2.0", "react-dom": "18.2.0" },
        }}
      >
        <div className="workspace">
          {/* File Explorer Sidebar */}
          <aside className="file-explorer">
            <FileExplorer
              files={files}
              activePath={activePath}
              setActivePath={setActivePath}
              deleteFile={deleteFile}
              createFile={createFile}
              renameFile={renameFile}
              onRefresh={handleLoad}
            />
          </aside>

          {/* Code Editor + Preview side-by-side */}
          <main className="editor-preview">
            <div className="editor-container">
              <MonacoEditor
                files={files}
                activePath={activePath}
                updateFile={updateFile}
                theme={theme}
              />
            </div>

            <div className="preview-container">
              <SandpackLayout className="preview-layout">
                <SandpackPreview
                  showOpenInCodeSandbox={false}
                  style={{ height: "100%", width: "100%" }}
                  showNavigator
                  showRefreshButton
                />
              </SandpackLayout>
            </div>
          </main>
        </div>
      </SandpackProvider>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
