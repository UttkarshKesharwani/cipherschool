// API utility functions for frontend-backend communication

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("cipherstudio_token");
};

// Set auth token in localStorage
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("cipherstudio_token", token);
  } else {
    localStorage.removeItem("cipherstudio_token");
  }
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || "An error occurred",
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Network error", 0, null);
  }
};

// Auth API functions
export const authApi = {
  // Register a new user
  register: async (userData) => {
    const response = await apiRequest("/users/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiRequest("/users/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  // Logout user
  logout: () => {
    setAuthToken(null);
  },

  // Get current user profile
  getProfile: async () => {
    return await apiRequest("/users/profile");
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return await apiRequest("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  // Change password
  changePassword: async (passwordData) => {
    return await apiRequest("/users/change-password", {
      method: "PUT",
      body: JSON.stringify(passwordData),
    });
  },

  // Get user statistics
  getStats: async () => {
    return await apiRequest("/users/stats");
  },

  // Deactivate user account
  deactivateAccount: async () => {
    return await apiRequest("/users/deactivate", {
      method: "PUT",
    });
  },

  // Delete user account
  deleteAccount: async (confirmData) => {
    return await apiRequest("/users/account", {
      method: "DELETE",
      body: JSON.stringify(confirmData),
    });
  },
};

// Projects API functions
export const projectsApi = {
  // Get all user projects
  getAll: async () => {
    return await apiRequest("/projects");
  },

  // Get a specific project
  getById: async (projectId) => {
    return await apiRequest(`/projects/${projectId}`);
  },

  // Create a new project
  create: async (projectData) => {
    return await apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
  },

  // Update a project
  update: async (projectId, projectData) => {
    return await apiRequest(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    });
  },

  // Delete a project
  delete: async (projectId) => {
    return await apiRequest(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  // Archive/restore a project
  archive: async (projectId) => {
    return await apiRequest(`/projects/${projectId}/archive`, {
      method: "PUT",
    });
  },

  restore: async (projectId) => {
    return await apiRequest(`/projects/${projectId}/restore`, {
      method: "PUT",
    });
  },

  // Duplicate a project
  duplicate: async (projectId, newName) => {
    return await apiRequest(`/projects/${projectId}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });
  },

  // Get public projects
  getPublic: async () => {
    return await apiRequest("/projects/public");
  },
};

// Files API functions
export const filesApi = {
  // Get project file tree
  getProjectTree: async (projectId) => {
    return await apiRequest(`/files/project/${projectId}/tree`);
  },

  // Get a specific file
  getById: async (fileId) => {
    return await apiRequest(`/files/${fileId}`);
  },

  // Create a new file
  create: async (fileData) => {
    return await apiRequest("/files", {
      method: "POST",
      body: JSON.stringify(fileData),
    });
  },

  // Update a file
  update: async (fileId, fileData) => {
    return await apiRequest(`/files/${fileId}`, {
      method: "PUT",
      body: JSON.stringify(fileData),
    });
  },

  // Delete a file
  delete: async (fileId) => {
    return await apiRequest(`/files/${fileId}`, {
      method: "DELETE",
    });
  },

  // Move/rename a file
  move: async (fileId, moveData) => {
    return await apiRequest(`/files/${fileId}/move`, {
      method: "PUT",
      body: JSON.stringify(moveData),
    });
  },

  // Search files in project
  search: async (projectId, query) => {
    return await apiRequest(
      `/files/project/${projectId}/search?q=${encodeURIComponent(query)}`
    );
  },

  // Download file
  download: async (fileId) => {
    const token = getAuthToken();
    const url = `${API_BASE_URL}/files/${fileId}/download`;

    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new ApiError("Failed to download file", response.status);
    }

    return response.blob();
  },

  // Bulk update files for a project
  bulkUpdate: async (projectId, files) => {
    return await apiRequest(`/files/project/${projectId}/bulk`, {
      method: "PUT",
      body: JSON.stringify({ files }),
    });
  },
};

// Export utilities
export { getAuthToken, setAuthToken, ApiError };
export default apiRequest;
