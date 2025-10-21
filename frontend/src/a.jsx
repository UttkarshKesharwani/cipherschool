import React, { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react";

import FileExplorer from "./components/FileExplorer";
import TopBar from "./components/TopBar";
// Use SandpackCodeEditor instead of the local custom editor for full editor features
import useProject from "./hooks/useProject";
// import "./styles.css";

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

  console.log(project);

  // Handle theme toggle
  useEffect(() => {
    if (theme === "light")
      document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
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
        template="react"
        files={sandpackFiles}
        customSetup={{
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
              {activePath ? (
                <SandpackCodeEditor
                  file={
                    activePath.startsWith("/") ? activePath : `/${activePath}`
                  }
                  showTabs={true}
                  showLineNumbers={true}
                  showInlineErrors={true}
                  wrapContent={false}
                  onChange={(code) => updateFile(activePath, code)}
                  style={{ height: "100%" , width: "100%"}}
                  className="sp-editor"
                />
              ) : (
                <div className="no-file">Select a file to start coding ✨</div>
              )}
            </div>

            <div className="preview-container">
              <SandpackLayout>
                <SandpackLayout
                  style={{ height: "100%" }}
                  className="sp-layout"
                >
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    style={{ height: "100%" }}
                    className="sp-preview"
                  />
                </SandpackLayout>
              </SandpackLayout>
            </div>
          </main>
        </div>
      </SandpackProvider>
    </div>
  );
}
