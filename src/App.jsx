import React, { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

import FileExplorer from "./components/FileExplorer";
import TopBar from "./components/TopBar";
import MonacoEditor from "./components/MonacoEditor";
import useProject from "./hooks/useProject";
import "./newStyles.css";

export default function App() {
  const project = useProject("default");
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
    setActivePath,
  } = project;

  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  return (
    <div className={`app-root ${theme}`}>
      <TopBar
        projectId={projectId}
        setProjectId={setProjectId}
        onSave={saveProject}
        onLoad={loadProject}
        autosave={autosave}
        setAutosave={setAutosave}
        onAddFile={() => {
          const n = prompt("Enter new file path", "/src/NewFile.jsx");
          if (n) createFile(n);
        }}
        theme={theme}
        setTheme={setTheme}
      />

      <SandpackProvider
        // template="react"
        files={sandpackFiles}
        customSetup={{
          entry: "/src/index.jsx",
          dependencies: { react: "18.2.0", "react-dom": "18.2.0" },
        }}
      >
        <div className="workspace">
          {/* 📁 File Explorer Sidebar */}
          <aside className="file-explorer">
            <FileExplorer
              files={files}
              activePath={activePath}
              setActivePath={setActivePath}
              deleteFile={deleteFile}
              createFile={createFile}
              renameFile={renameFile}
              onRefresh={loadProject}
            />
          </aside>

          {/* 🧠 Code Editor + ⚡ Preview side-by-side */}
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
