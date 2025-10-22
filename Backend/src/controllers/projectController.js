const { Project, File } = require("../models");
const { asyncHandler } = require("../middleware/errorHandler");

// Default project templates
const defaultTemplates = {
  react: {
    name: "React App",
    files: [
      {
        name: "src",
        type: "folder",
        path: "src",
        children: [
          {
            name: "index.js",
            type: "file",
            path: "src/index.js",
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
            language: "javascript",
          },
          {
            name: "App.js",
            type: "file",
            path: "src/App.js",
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to CipherStudio</h1>
        <p>Start building your React application!</p>
      </header>
    </div>
  );
}

export default App;`,
            language: "jsx",
          },
          {
            name: "App.css",
            type: "file",
            path: "src/App.css",
            content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}`,
            language: "css",
          },
          {
            name: "index.css",
            type: "file",
            path: "src/index.css",
            content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,
            language: "css",
          },
        ],
      },
      {
        name: "public",
        type: "folder",
        path: "public",
        children: [
          {
            name: "index.html",
            type: "file",
            path: "public/index.html",
            content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="React app created in CipherStudio" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
            language: "html",
          },
        ],
      },
      {
        name: "package.json",
        type: "file",
        path: "package.json",
        content: JSON.stringify(
          {
            name: "my-react-app",
            version: "1.0.0",
            description: "A React application created in CipherStudio",
            main: "src/index.js",
            dependencies: {
              react: "^18.2.0",
              "react-dom": "^18.2.0",
            },
            scripts: {
              start: "react-scripts start",
              build: "react-scripts build",
              test: "react-scripts test",
              eject: "react-scripts eject",
            },
            browserslist: {
              production: [">0.2%", "not dead", "not op_mini all"],
              development: [
                "last 1 chrome version",
                "last 1 firefox version",
                "last 1 safari version",
              ],
            },
          },
          null,
          2
        ),
        language: "json",
      },
    ],
  },
};

// Helper function to create template files
const createTemplateFiles = async (
  projectId,
  template,
  parentId = null,
  basePath = ""
) => {
  const files = [];

  for (const item of template) {
    const file = new File({
      name: item.name,
      projectId,
      parentId,
      type: item.type,
      path: item.path,
      content: item.content || "",
      language: item.language || "javascript",
    });

    await file.save();
    files.push(file);

    if (item.type === "folder" && item.children) {
      await createTemplateFiles(projectId, item.children, file._id, item.path);
    }
  }

  return files;
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    template = "react",
    isPublic = false,
    tags = [],
    files = [], // Accept files from frontend
  } = req.body;

  // Create project
  const project = await Project.create({
    name,
    description,
    userId: req.user._id,
    template,
    isPublic,
    tags,
  });

  // Create files - prioritize files from frontend, fallback to template
  if (files && files.length > 0) {
    // Use files sent from frontend
    for (const fileData of files) {
      try {
        const { path, content, name, type = "file", language } = fileData;

        if (!path || !name) {
          console.warn("Skipping file with missing path or name:", fileData);
          continue;
        }

        const file = new File({
          name,
          projectId: project._id, // Use the actual project ID
          path,
          type,
          content: content || "",
          language: language || "text",
          createdBy: req.user._id,
          lastModified: new Date(),
        });

        await file.save();
      } catch (error) {
        console.error(`Error creating file ${fileData.path}:`, error);
      }
    }
  } else if (template && defaultTemplates[template]) {
    // Fallback to template files if no files provided
    await createTemplateFiles(project._id, defaultTemplates[template].files);
  }

  // Update project metadata
  const totalFiles = await File.countDocuments({ projectId: project._id });
  project.metadata.totalFiles = totalFiles;
  await project.save();

  // Populate the project with user info
  await project.populate("userId", "username email firstName lastName");

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: {
      project,
    },
  });
});

// @desc    Get all projects for a user
// @route   GET /api/projects
// @access  Private
const getUserProjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    includeArchived = false,
    sortBy = "updatedAt",
    sortOrder = "desc",
  } = req.query;

  const options = {
    includeArchived: includeArchived === "true",
    sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    search,
  };

  const projects = await Project.findUserProjects(req.user._id, options);

  const totalProjects = await Project.countDocuments({
    userId: req.user._id,
    ...(options.includeArchived ? {} : { isArchived: false }),
    ...(search && {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ],
    }),
  });

  res.status(200).json({
    success: true,
    data: {
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProjects / parseInt(limit)),
        totalProjects,
        hasNextPage:
          parseInt(page) < Math.ceil(totalProjects / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      },
    },
  });
});

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate(
    "userId",
    "username email firstName lastName"
  );

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check if user owns the project or if it's public
  if (
    project.userId._id.toString() !== req.user._id.toString() &&
    !project.isPublic
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied. This project belongs to another user and is private.",
      debug: {
        projectOwner: project.userId.email,
        currentUser: req.user.email,
        isPublic: project.isPublic,
      },
    });
  }

  // Get project file tree
  const fileTree = await File.buildFileTree(project._id);

  res.status(200).json({
    success: true,
    data: {
      project: {
        ...project.toObject(),
        fileTree,
      },
    },
  });
});

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = asyncHandler(async (req, res) => {
  const { name, description, isPublic, tags, settings } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check ownership
  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Update fields
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (isPublic !== undefined) project.isPublic = isPublic;
  if (tags !== undefined) project.tags = tags;
  if (settings !== undefined) {
    project.settings = { ...project.settings.toObject(), ...settings };
  }

  project.metadata.lastModified = new Date();
  await project.save();

  await project.populate("userId", "username email firstName lastName");

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
    data: {
      project,
    },
  });
});

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check ownership
  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Delete all files in the project
  await File.deleteMany({ projectId: project._id });

  // Delete the project
  await Project.findByIdAndDelete(project._id);

  res.status(200).json({
    success: true,
    message: "Project deleted successfully",
  });
});

// @desc    Archive a project
// @route   PUT /api/projects/:id/archive
// @access  Private
const archiveProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check ownership
  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  await project.archive();

  res.status(200).json({
    success: true,
    message: "Project archived successfully",
    data: {
      project,
    },
  });
});

// @desc    Restore a project
// @route   PUT /api/projects/:id/restore
// @access  Private
const restoreProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check ownership
  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  await project.restore();

  res.status(200).json({
    success: true,
    message: "Project restored successfully",
    data: {
      project,
    },
  });
});

// @desc    Duplicate a project
// @route   POST /api/projects/:id/duplicate
// @access  Private
const duplicateProject = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const originalProject = await Project.findById(req.params.id);

  if (!originalProject) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check if user owns the project or if it's public
  if (
    originalProject.userId.toString() !== req.user._id.toString() &&
    !originalProject.isPublic
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Create new project
  const duplicatedProject = await Project.create({
    name: name || `${originalProject.name} (Copy)`,
    description: originalProject.description,
    userId: req.user._id,
    template: originalProject.template,
    isPublic: false, // Always make duplicates private
    tags: originalProject.tags,
    settings: originalProject.settings,
    packageJson: originalProject.packageJson,
  });

  // Get all files from original project
  const originalFiles = await File.find({ projectId: originalProject._id });

  // Create a mapping of old IDs to new IDs for folders
  const idMapping = {};

  // First pass: create all files/folders
  for (const originalFile of originalFiles) {
    const newFile = new File({
      name: originalFile.name,
      projectId: duplicatedProject._id,
      parentId: null, // Will be updated in second pass
      type: originalFile.type,
      path: originalFile.path,
      content: originalFile.content,
      language: originalFile.language,
      size: originalFile.size,
      encoding: originalFile.encoding,
      mimeType: originalFile.mimeType,
    });

    await newFile.save();
    idMapping[originalFile._id.toString()] = newFile._id;
  }

  // Second pass: update parent IDs
  for (const originalFile of originalFiles) {
    if (originalFile.parentId) {
      const newFileId = idMapping[originalFile._id.toString()];
      const newParentId = idMapping[originalFile.parentId.toString()];

      await File.findByIdAndUpdate(newFileId, { parentId: newParentId });
    }
  }

  // Update project metadata
  duplicatedProject.metadata.totalFiles = originalFiles.length;
  await duplicatedProject.save();

  await duplicatedProject.populate(
    "userId",
    "username email firstName lastName"
  );

  res.status(201).json({
    success: true,
    message: "Project duplicated successfully",
    data: {
      project: duplicatedProject,
    },
  });
});

// @desc    Get public projects
// @route   GET /api/projects/public
// @access  Public
const getPublicProjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    sortBy = "updatedAt",
    sortOrder = "desc",
  } = req.query;

  const query = {
    isPublic: true,
    isArchived: false,
  };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  const projects = await Project.find(query)
    .populate("userId", "username firstName lastName")
    .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const totalProjects = await Project.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProjects / parseInt(limit)),
        totalProjects,
        hasNextPage:
          parseInt(page) < Math.ceil(totalProjects / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      },
    },
  });
});

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  duplicateProject,
  getPublicProjects,
};
