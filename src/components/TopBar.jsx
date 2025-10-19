import React from "react";

export default function TopBar({
  projectId,
  setProjectId,
  onSave,
  onLoad,
  autosave,
  setAutosave,
  onAddFile,
  theme,
  setTheme,
}) {
  return (
    <header className="topbar">
      <div className="left">
        <h2>CipherStudio</h2>
      </div>
      <div className="center">
        <input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="project-input"
        />
        <button onClick={onSave}>Save</button>
        <button onClick={onLoad}>Load</button>
        <label className="autosave">
          <input
            type="checkbox"
            checked={autosave}
            onChange={(e) => setAutosave(e.target.checked)}
          />{" "}
          Autosave
        </label>
      </div>
      <div className="right">
        <button onClick={onAddFile}>+ New File</button>
        <button
          className="theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>
    </header>
  );
}
