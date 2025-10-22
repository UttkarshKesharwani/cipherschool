import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { projectsApi } from "../lib/api";

export default function ProjectList({
  onSelectProject,
  onClose,
  currentProjectId,
}) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [publicProjects, setPublicProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("my-projects");

  useEffect(() => {
    loadProjects();
  }, [isAuthenticated]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load user's projects if authenticated
      if (isAuthenticated) {
        const userProjectsResponse = await projectsApi.getAll();
        setProjects(userProjectsResponse.data.projects || []);
      }

      // Load public projects
      const publicProjectsResponse = await projectsApi.getPublic();
      setPublicProjects(publicProjectsResponse.data.projects || []);
    } catch (err) {
      console.error("Error loading projects:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project) => {
    onSelectProject(project._id);
    onClose();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ProjectCard = ({ project, isPublic = false }) => (
    <div
      className={`project-card ${
        currentProjectId === project._id ? "active" : ""
      }`}
      onClick={() => handleSelectProject(project)}
    >
      <div className="project-header">
        <h3 className="project-name">{project.name}</h3>
        <div className="project-badges">
          {isPublic && <span className="badge public">Public</span>}
          {project.isPublic && <span className="badge public">Public</span>}
          {!project.isPublic && !isPublic && (
            <span className="badge private">Private</span>
          )}
        </div>
      </div>

      {project.description && (
        <p className="project-description">{project.description}</p>
      )}

      <div className="project-meta">
        <span className="project-files">
          {project.metadata?.totalFiles || 0} files
        </span>
        <span className="project-date">
          Updated:{" "}
          {formatDate(project.metadata?.lastModified || project.updatedAt)}
        </span>
      </div>

      {!isPublic && (
        <div className="project-owner">
          By:{" "}
          {project.userId?.firstName || project.userId?.username || "Unknown"}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="project-list-modal">
        <div className="project-list-content">
          <div className="project-list-header">
            <h2>Loading Projects...</h2>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="loading">Loading your projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-list-modal">
      <div className="project-list-content">
        <div className="project-list-header">
          <h2>Your Projects</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && (
          <div className="error-message">
            Error loading projects: {error}
            <button onClick={loadProjects}>Retry</button>
          </div>
        )}

        <div className="project-tabs">
          {isAuthenticated && (
            <button
              className={`tab ${activeTab === "my-projects" ? "active" : ""}`}
              onClick={() => setActiveTab("my-projects")}
            >
              My Projects ({projects.length})
            </button>
          )}
          <button
            className={`tab ${activeTab === "public-projects" ? "active" : ""}`}
            onClick={() => setActiveTab("public-projects")}
          >
            Public Projects ({publicProjects.length})
          </button>
        </div>

        <div className="projects-container">
          {activeTab === "my-projects" && isAuthenticated && (
            <div className="projects-grid">
              {projects.length === 0 ? (
                <div className="no-projects">
                  <p>You haven't created any projects yet.</p>
                  <p>Click "New Project" to get started!</p>
                </div>
              ) : (
                projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    isPublic={false}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "public-projects" && (
            <div className="projects-grid">
              {publicProjects.length === 0 ? (
                <div className="no-projects">
                  <p>No public projects available.</p>
                </div>
              ) : (
                publicProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    isPublic={true}
                  />
                ))
              )}
            </div>
          )}
        </div>

        <div className="project-list-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          {!isAuthenticated && (
            <p className="auth-hint">
              Sign in to see your private projects and create new ones!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
