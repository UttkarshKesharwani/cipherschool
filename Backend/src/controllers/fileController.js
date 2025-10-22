const { File, Project } = require("../models");
const { asyncHandler } = require("../middleware/errorHandler");

// @desc    Create a new file or folder
// @route   POST /api/files
// @access  Private
const createFile = asyncHandler(async (req, res) => {
  const { name, projectId, parentId, type, content = "", language } = req.body;

  // Check if project exists and user owns it
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Build file path
  let filePath = name;
  if (parentId) {
    const parentFile = await File.findById(parentId);
    if (!parentFile) {
      return res.status(404).json({
        success: false,
        message: "Parent folder not found",
      });
    }

    if (parentFile.type !== "folder") {
      return res.status(400).json({
        success: false,
        message: "Parent must be a folder",
      });
    }

    filePath = `${parentFile.path}/${name}`;
  }

  // Check if file/folder already exists at this path
  const existingFile = await File.findOne({ projectId, path: filePath });
  if (existingFile) {
    return res.status(400).json({
      success: false,
      message: "File or folder already exists at this path",
    });
  }

  // Create file record with content stored directly in MongoDB
  const file = await File.create({
    name,
    projectId,
    parentId: parentId || null,
    type,
    path: filePath,
    content: type === "file" ? content : "",
    language: language || "javascript",
  });

  // Update project metadata
  const totalFiles = await File.countDocuments({ projectId, type: "file" });
  const totalSize = await File.aggregate([
    { $match: { projectId: project._id, type: "file" } },
    { $group: { _id: null, totalSize: { $sum: "$size" } } },
  ]);

  project.metadata.totalFiles = totalFiles;
  project.metadata.totalSize = totalSize[0]?.totalSize || 0;
  project.metadata.lastModified = new Date();
  await project.save();

  res.status(201).json({
    success: true,
    message: `${type === "file" ? "File" : "Folder"} created successfully`,
    data: {
      file,
    },
  });
});

// @desc    Get file/folder by ID
// @route   GET /api/files/:id
// @access  Private
const getFileById = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id).populate("projectId");

  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  // Check if user owns the project
  if (file.projectId.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Get file content directly from database
  const fileContent = file.content;

  res.status(200).json({
    success: true,
    data: {
      file: {
        ...file.toObject(),
        content: fileContent,
      },
    },
  });
});

// @desc    Update file content or folder name
// @route   PUT /api/files/:id
// @access  Private
const updateFile = asyncHandler(async (req, res) => {
  const { name, content, parentId } = req.body;

  const file = await File.findById(req.params.id).populate("projectId");

  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  // Check if user owns the project
  if (file.projectId.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const oldPath = file.path;
  let newPath = file.path;

  // Handle name change
  if (name && name !== file.name) {
    // Check if new name already exists in the same directory
    const parentPath = file.parentId
      ? (await File.findById(file.parentId)).path
      : "";

    newPath = parentPath ? `${parentPath}/${name}` : name;

    const existingFile = await File.findOne({
      projectId: file.projectId._id,
      path: newPath,
      _id: { $ne: file._id },
    });

    if (existingFile) {
      return res.status(400).json({
        success: false,
        message: "File or folder with this name already exists",
      });
    }

    file.name = name;
    file.path = newPath;
  }

  // Handle content update for files
  if (content !== undefined && file.type === "file") {
    file.content = content;
    file.metadata.version += 1;
  }

  // Handle parent change (move operation)
  if (parentId !== undefined && parentId !== file.parentId?.toString()) {
    if (parentId) {
      const newParent = await File.findById(parentId);
      if (!newParent || newParent.type !== "folder") {
        return res.status(400).json({
          success: false,
          message: "Invalid parent folder",
        });
      }

      newPath = `${newParent.path}/${file.name}`;
    } else {
      newPath = file.name;
    }

    // Check if file already exists at new location
    const existingFile = await File.findOne({
      projectId: file.projectId._id,
      path: newPath,
      _id: { $ne: file._id },
    });

    if (existingFile) {
      return res.status(400).json({
        success: false,
        message: "File or folder already exists at destination",
      });
    }

    file.parentId = parentId || null;
    file.path = newPath;
  }

  // Path updated - no additional storage operations needed since content is in MongoDB

  file.metadata.lastModified = new Date();
  await file.save();

  // Update children paths if this is a folder and path changed
  if (file.type === "folder" && newPath !== oldPath) {
    await file.updateChildrenPaths(oldPath, newPath);
  }

  // Update project metadata
  const project = await Project.findById(file.projectId._id);
  project.metadata.lastModified = new Date();
  await project.save();

  res.status(200).json({
    success: true,
    message: `${file.type === "file" ? "File" : "Folder"} updated successfully`,
    data: {
      file,
    },
  });
});

// @desc    Delete file or folder
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id).populate("projectId");

  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  // Check if user owns the project
  if (file.projectId.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // No external storage cleanup needed - content is stored in MongoDB

  // Delete from database (this will handle recursive deletion for folders)
  await file.deleteRecursively();

  // Update project metadata
  const project = await Project.findById(file.projectId._id);
  const totalFiles = await File.countDocuments({
    projectId: project._id,
    type: "file",
  });
  const totalSize = await File.aggregate([
    { $match: { projectId: project._id, type: "file" } },
    { $group: { _id: null, totalSize: { $sum: "$size" } } },
  ]);

  project.metadata.totalFiles = totalFiles;
  project.metadata.totalSize = totalSize[0]?.totalSize || 0;
  project.metadata.lastModified = new Date();
  await project.save();

  res.status(200).json({
    success: true,
    message: `${file.type === "file" ? "File" : "Folder"} deleted successfully`,
  });
});

// @desc    Get project file tree
// @route   GET /api/files/project/:projectId/tree
// @access  Public (if project is public) / Private (if project is private)
const getProjectFileTree = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Check if project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check if user owns the project or if it's public
  const isOwner =
    req.user && project.userId.toString() === req.user._id.toString();

  if (!isOwner && !project.isPublic) {
    return res.status(403).json({
      success: false,
      message: req.user
        ? "Access denied. This project belongs to another user and is private."
        : "Access denied. Authentication required for private projects.",
      debug: {
        projectOwner: project.userId,
        currentUser: req.user?._id || "Anonymous",
        isPublic: project.isPublic,
      },
    });
  }

  const fileTree = await File.buildFileTree(projectId);

  res.status(200).json({
    success: true,
    data: {
      fileTree,
    },
  });
});

// @desc    Move file or folder
// @route   PUT /api/files/:id/move
// @access  Private
const moveFile = asyncHandler(async (req, res) => {
  const { parentId, name } = req.body;

  const file = await File.findById(req.params.id).populate("projectId");

  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  // Check if user owns the project
  if (file.projectId.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  await file.moveTo(parentId, name);

  res.status(200).json({
    success: true,
    message: `${file.type === "file" ? "File" : "Folder"} moved successfully`,
    data: {
      file,
    },
  });
});

// @desc    Search files in project
// @route   GET /api/files/project/:projectId/search
// @access  Private
const searchFiles = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { q: query, type, limit = 50 } = req.query;

  // Check if project exists and user owns it
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  const files = await File.findByPattern(projectId, query, { type, limit });

  res.status(200).json({
    success: true,
    data: {
      files,
      totalResults: files.length,
    },
  });
});

// @desc    Get file download URL
// @route   GET /api/files/:id/download
// @access  Private
const getFileDownloadUrl = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id).populate("projectId");

  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  // Check if user owns the project
  if (file.projectId.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  if (file.type !== "file") {
    return res.status(400).json({
      success: false,
      message: "Cannot download a folder",
    });
  }

  // Return file content directly since it's stored in MongoDB
  res.status(200).json({
    success: true,
    data: {
      content: file.content,
      fileName: file.name,
      size: file.content.length,
      mimeType: file.mimeType,
    },
  });
});

// @desc    Bulk update files for a project
// @route   PUT /api/files/project/:projectId/bulk
// @access  Private
const bulkUpdateFiles = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { files } = req.body;

  // Check if project exists and user owns it
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  if (project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  if (!Array.isArray(files)) {
    return res.status(400).json({
      success: false,
      message: "Files must be an array",
    });
  }

  const results = {
    created: [],
    updated: [],
    errors: [],
  };

  // Process each file
  for (const fileData of files) {
    try {
      const { path, content, name, type = "file", language } = fileData;

      if (!path || !name) {
        console.warn(`Skipping file with missing path or name:`, fileData);
        results.errors.push({
          path: path || "unknown",
          error: "Path and name are required",
        });
        continue;
      }

      // Check if file already exists
      const existingFile = await File.findOne({ projectId, path });

      if (existingFile) {
        // Update existing file
        existingFile.content = content || "";
        existingFile.lastModified = new Date();
        if (language) existingFile.language = language;

        await existingFile.save();
        results.updated.push({
          id: existingFile._id,
          path: existingFile.path,
          name: existingFile.name,
        });
      } else {
        // Create new file
        const newFile = new File({
          name,
          projectId,
          path,
          type,
          content: content || "",
          language: language || "text",
          createdBy: req.user._id,
          lastModified: new Date(),
        });

        await newFile.save();
        results.created.push({
          id: newFile._id,
          path: newFile.path,
          name: newFile.name,
        });
      }
    } catch (error) {
      console.error(`Error processing file ${fileData.path}:`, error);
      results.errors.push({
        path: fileData.path || "unknown",
        error: error.message,
      });
    }
  }

  // Update project's last modified date
  project.metadata.lastModified = new Date();
  await project.save();

  res.status(200).json({
    success: true,
    message: "Bulk file update completed",
    data: {
      results,
      summary: {
        total: files.length,
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length,
      },
    },
  });
});

module.exports = {
  createFile,
  getFileById,
  updateFile,
  deleteFile,
  getProjectFileTree,
  moveFile,
  searchFiles,
  getFileDownloadUrl,
  bulkUpdateFiles,
};
