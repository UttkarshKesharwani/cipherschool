import React, { useEffect, useState, useRef } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";

import { AuthProvider } from "./contexts/AuthContext";
import FileExplorer from "./components/FileExplorer";
import TopBar from "./components/TopBar";
import MonacoEditor from "./components/MonacoEditor";
import ProjectList from "./components/ProjectList";
import useProjectApi from "./hooks/useProjectApi";
import "./newStyles.css";
import "./styles/project-list.css";

// Component to handle Sandpack refresh when project changes
function SandpackController({ projectId, isLoading, forceRefresh }) {
  const { sandpack } = useSandpack();
  const prevProjectIdRef = useRef(projectId);
  const prevForceRefreshRef = useRef(forceRefresh);

  useEffect(() => {
    // If projectId changed or forceRefresh incremented, refresh the preview
    if (
      (prevProjectIdRef.current !== projectId ||
        prevForceRefreshRef.current !== forceRefresh) &&
      !isLoading &&
      sandpack
    ) {
      console.log(
        "Project changed or refresh triggered, refreshing Sandpack preview..."
      );
      // Small delay to ensure files are loaded
      setTimeout(() => {
        if (sandpack.refresh) {
          sandpack.refresh();
        }
      }, 200);
    }
    prevProjectIdRef.current = projectId;
    prevForceRefreshRef.current = forceRefresh;
  }, [projectId, isLoading, sandpack, forceRefresh]);

  return null; // This component doesn't render anything
}

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
    hasUnsavedChanges,
  } = project;

  const [theme, setTheme] = useState("dark");
  const [forceRefresh, setForceRefresh] = useState(0); // Counter to force refresh
  const [showProjectList, setShowProjectList] = useState(false);

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
      const newProjectId = newProject._id;

      setForceRefresh((prev) => prev + 1);

      return newProject;
    } catch (err) {
      alert("Failed to create project: " + err.message);
      throw err;
    }
  };

  const handleSave = async () => {
    try {
      await saveProject();
    } catch (err) {
      alert("Failed to save project: " + err.message);
    }
  };

  const handleLoad = async () => {
    try {
      await loadProject();
      console.log("Project loaded successfully");
      // Force Sandpack to refresh by incrementing the counter
      setForceRefresh((prev) => prev + 1);
    } catch (err) {
      alert("Failed to load project: " + err.message);
    }
  };

  const handleShowProjectList = () => {
    setShowProjectList(true);
  };

  const handleSelectProject = (selectedProjectId) => {
    setShowProjectList(false);
    setProjectId(selectedProjectId);

    setTimeout(() => {
      loadProject(selectedProjectId)
        .then(() => {
          setForceRefresh((prev) => prev + 1);
        })
        .catch((err) => {
          alert("Failed to load project: " + err.message);
        });
    }, 100);
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
        onShowProjectList={handleShowProjectList}
        autosave={autosave}
        setAutosave={setAutosave}
        theme={theme}
        setTheme={setTheme}
        isSaving={isSaving}
        isLoading={isLoading}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      <SandpackProvider
        key={`${projectId}-${forceRefresh}`} // Force remount when projectId or forceRefresh changes
        files={sandpackFiles}
        customSetup={{
          entry: "/src/index.jsx",
          dependencies: { react: "18.2.0", "react-dom": "18.2.0" },
        }}
      >
        <SandpackController
          projectId={projectId}
          isLoading={isLoading}
          forceRefresh={forceRefresh}
        />
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

      {/* Project List Modal */}
      {showProjectList && (
        <ProjectList
          onSelectProject={handleSelectProject}
          onClose={() => setShowProjectList(false)}
          currentProjectId={projectId}
        />
      )}
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
