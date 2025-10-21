import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "./AuthModal";

export default function TopBar({
  projectId,
  setProjectId,
  onSave,
  onLoad,
  onCreateProject,
  autosave,
  setAutosave,
  onAddFile,
  theme,
  setTheme,
  isSaving,
  isLoading,
}) {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const handleLogin = () => {
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setAuthMode("register");
    setShowAuthModal(true);
  };

  const handleCreateProject = () => {
    if (isAuthenticated) {
      setShowNewProjectModal(true);
    } else {
      const name = prompt("Enter project name:");
      if (name) {
        onCreateProject(name);
      }
    }
  };

  const handleNewProject = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const description = formData.get("description");

    if (name) {
      onCreateProject(name, description);
      setShowNewProjectModal(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="left">
          <h2>CipherStudio</h2>
        </div>
        <div className="center">
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="project-input"
            placeholder="Project ID"
          />
          <button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={onLoad} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load"}
          </button>
          <button onClick={handleCreateProject}>+ New Project</button>
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

          {isAuthenticated ? (
            <div className="user-dropdown">
              <button
                className="user-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                👤 {user?.firstName || user?.username}
              </button>
              {showUserMenu && (
                <div className="user-menu">
                  <div className="user-info">
                    <p className="user-name">
                      {user?.fullName || user?.username}
                    </p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                  <button
                    className="user-menu-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profile
                  </button>
                  <button
                    className="user-menu-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Settings
                  </button>
                  <button
                    className="user-menu-item danger"
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button onClick={handleLogin} className="login-btn">
                Login
              </button>
              <button onClick={handleRegister} className="register-btn">
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />

      {showNewProjectModal && (
        <div
          className="auth-modal-overlay"
          onClick={() => setShowNewProjectModal(false)}
        >
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h2>Create New Project</h2>
              <button
                className="close-button"
                onClick={() => setShowNewProjectModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleNewProject} className="auth-form">
              <div className="form-group">
                <label htmlFor="name">Project Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Enter project name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  placeholder="Project description (optional)"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-bg)",
                    color: "var(--text-color)",
                    fontSize: "14px",
                    resize: "vertical",
                    minHeight: "80px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button type="submit" className="auth-button">
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
