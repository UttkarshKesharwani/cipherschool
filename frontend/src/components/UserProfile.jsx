import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../lib/api";
import "../styles/user-profile.css";
import "../styles/user-profile.css";

const UserProfile = ({ isOpen, onClose }) => {
  const { user, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);

  // Profile form data
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    preferences: {
      theme: user?.preferences?.theme || "dark",
      autoSave: user?.preferences?.autoSave || true,
      fontSize: user?.preferences?.fontSize || 14,
    },
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Load user stats
  useEffect(() => {
    if (isOpen && activeTab === "stats") {
      loadUserStats();
    }
  }, [isOpen, activeTab]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        preferences: {
          theme: user.preferences?.theme || "dark",
          autoSave: user.preferences?.autoSave || true,
          fontSize: user.preferences?.fontSize || 14,
        },
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  const loadUserStats = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getStats();
      setStats(response.data);
    } catch (err) {
      setError("Failed to load statistics");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      await updateProfile(profileData);
      setSuccess("Profile updated successfully!");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      setError(
        "New password must contain at least one uppercase letter, one lowercase letter, and one number"
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Password change error:", err);

      // Handle validation errors
      if (
        err.message &&
        err.message.includes("Current password is incorrect")
      ) {
        setError("Current password is incorrect");
      } else if (err.message && err.message.includes("password must contain")) {
        setError(
          "New password must contain at least one uppercase letter, one lowercase letter, and one number"
        );
      } else {
        setError(err.message || "Failed to change password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to deactivate your account? You can reactivate it by logging in again."
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await authApi.deactivateAccount();
      alert("Account deactivated successfully");
      logout();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to deactivate account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const password = prompt(
      "Please enter your password to confirm account deletion:"
    );
    if (!password) return;

    if (
      !window.confirm(
        "⚠️ WARNING: This will permanently delete your account and all your projects. This action cannot be undone. Are you absolutely sure?"
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await authApi.deleteAccount({ password });
      alert("Account deleted successfully");
      logout();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e, section) => {
    const { name, value, type, checked } = e.target;
    const finalValue =
      type === "checkbox"
        ? checked
        : type === "number"
        ? parseInt(value)
        : value;

    if (section === "profile") {
      if (name.startsWith("preferences.")) {
        const prefKey = name.split(".")[1];
        setProfileData((prev) => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            [prefKey]: finalValue,
          },
        }));
      } else {
        setProfileData((prev) => ({
          ...prev,
          [name]: finalValue,
        }));
      }
    } else if (section === "password") {
      setPasswordData((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-profile-header">
          <h2>User Profile</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="user-profile-tabs">
          <button
            className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("profile");
              clearMessages();
            }}
          >
            Profile
          </button>
          <button
            className={`tab-button ${activeTab === "password" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("password");
              clearMessages();
            }}
          >
            Password
          </button>
          <button
            className={`tab-button ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("stats");
              clearMessages();
            }}
          >
            Statistics
          </button>
          <button
            className={`tab-button ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("settings");
              clearMessages();
            }}
          >
            Settings
          </button>
        </div>

        <div className="user-profile-content">
          {error && <div className="error-message">{error}</div>}

          {success && <div className="success-message">{success}</div>}

          {activeTab === "profile" && (
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="user-info-display">
                <div className="info-item">
                  <strong>Username:</strong> {user?.username}
                </div>
                <div className="info-item">
                  <strong>Email:</strong> {user?.email}
                </div>
                <div className="info-item">
                  <strong>Member since:</strong>{" "}
                  {new Date(user?.createdAt).toLocaleDateString()}
                </div>
                <div className="info-item">
                  <strong>Last login:</strong>{" "}
                  {user?.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "Never"}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={(e) => handleInputChange(e, "profile")}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={(e) => handleInputChange(e, "profile")}
                  placeholder="Enter your last name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="theme">Theme Preference</label>
                <select
                  id="theme"
                  name="preferences.theme"
                  value={profileData.preferences.theme}
                  onChange={(e) => handleInputChange(e, "profile")}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fontSize">Font Size</label>
                <input
                  type="range"
                  id="fontSize"
                  name="preferences.fontSize"
                  min="10"
                  max="24"
                  value={profileData.preferences.fontSize}
                  onChange={(e) => handleInputChange(e, "profile")}
                />
                <span className="range-value">
                  {profileData.preferences.fontSize}px
                </span>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="preferences.autoSave"
                    checked={profileData.preferences.autoSave}
                    onChange={(e) => handleInputChange(e, "profile")}
                  />
                  Enable auto-save
                </label>
              </div>

              <button
                type="submit"
                className="profile-button primary"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => handleInputChange(e, "password")}
                  placeholder="Enter your current password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => handleInputChange(e, "password")}
                  placeholder="Enter your new password"
                  required
                />
                <small
                  style={{
                    color: "var(--text)",
                    opacity: 0.7,
                    fontSize: "12px",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Must be at least 6 characters with uppercase, lowercase, and
                  number
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handleInputChange(e, "password")}
                  placeholder="Confirm your new password"
                  required
                />
              </div>

              <button
                type="submit"
                className="profile-button primary"
                disabled={isLoading}
              >
                {isLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          )}

          {activeTab === "stats" && (
            <div className="stats-content">
              {isLoading ? (
                <div className="loading">Loading statistics...</div>
              ) : stats ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">
                      {stats.stats.totalProjects}
                    </div>
                    <div className="stat-label">Total Projects</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{stats.stats.totalFiles}</div>
                    <div className="stat-label">Total Files</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {stats.stats.publicProjects}
                    </div>
                    <div className="stat-label">Public Projects</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {stats.stats.archivedProjects}
                    </div>
                    <div className="stat-label">Archived Projects</div>
                  </div>

                  {stats.recentProjects && stats.recentProjects.length > 0 && (
                    <div className="recent-projects">
                      <h3>Recent Projects</h3>
                      <ul>
                        {stats.recentProjects.map((project) => (
                          <li key={project._id}>
                            <span className="project-name">{project.name}</span>
                            <span className="project-date">
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-stats">No statistics available</div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="settings-content">
              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <p>These actions are permanent and cannot be undone.</p>

                <button
                  onClick={handleDeactivateAccount}
                  className="profile-button warning"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Deactivate Account"}
                </button>

                <button
                  onClick={handleDeleteAccount}
                  className="profile-button danger"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Delete Account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
