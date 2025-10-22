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
      console.log("Creating new project:", name);
      const newProject = await createProject(name, description);
      console.log("Project created:", newProject);

      // Get the new project ID
      const newProjectId = newProject._id;
      console.log("New project ID:", newProjectId);

      // The createProject function already sets projectId internally and loads the project
      // TopBar will automatically sync the URL when projectId updates
      // Just force a Sandpack refresh to ensure preview is updated
      setForceRefresh((prev) => prev + 1);

      console.log(
        `Successfully created and switched to project: ${newProjectId}`
      );
      return newProject; // Return the project for TopBar
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Failed to create project: " + err.message);
      throw err; // Re-throw for TopBar error handling
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
    console.log("Switching to project:", selectedProjectId);

    // Close the project list first
    setShowProjectList(false);

    // Update the project ID - TopBar will automatically update URL
    setProjectId(selectedProjectId);

    // Load the project and refresh UI
    setTimeout(() => {
      loadProject(selectedProjectId)
        .then(() => {
          setForceRefresh((prev) => prev + 1);
          console.log("Project loaded and UI refreshed:", selectedProjectId);
        })
        .catch((err) => {
          console.error("Failed to load selected project:", err);
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

      {/* Debug Panel to show project ID sync */}
      <div
        style={{
          position: "fixed",
          top: "60px",
          right: "10px",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "10px",
          fontSize: "12px",
          fontFamily: "monospace",
          zIndex: 9999,
          borderRadius: "4px",
          minWidth: "250px",
        }}
      >
        <div>
          <strong>Current Project ID:</strong> {projectId}
        </div>
        <div>
          <strong>URL Param:</strong>{" "}
          {new URLSearchParams(window.location.search).get("projectId") ||
            "none"}
        </div>
        <div>
          <strong>Files Count:</strong> {Object.keys(files).length}
        </div>
        <div>
          <strong>Active File:</strong> {activePath?.split("/").pop() || "none"}
        </div>
        {isLoading && <div style={{ color: "yellow" }}>🔄 Loading...</div>}
      </div>

      <TopBar
        projectId={projectId}
        setProjectId={setProjectId}
        onSave={handleSave}
        onLoad={handleLoad}
        onCreateProject={handleCreateProject}
        onShowProjectList={handleShowProjectList}
        autosave={autosave}
        setAutosave={setAutosave}
        onAddFile={handleAddFile}
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
