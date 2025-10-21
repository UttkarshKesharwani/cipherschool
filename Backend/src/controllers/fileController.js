const { File, Project } = require("../models");
const { asyncHandler } = require("../middleware/errorHandler");
const s3Service = require("../services/s3Service");

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

  let s3Key = null;

  // Upload file content to S3 if it's a file (not folder)
  if (type === "file" && content) {
    try {
      s3Key = s3Service.generateS3Key(projectId, filePath, req.user._id);

      // Determine MIME type based on file extension
      const extension = name.split(".").pop().toLowerCase();
      const mimeTypeMap = {
        js: "application/javascript",
        jsx: "application/javascript",
        ts: "application/typescript",
        tsx: "application/typescript",
        css: "text/css",
        scss: "text/scss",
        sass: "text/sass",
        html: "text/html",
        json: "application/json",
        md: "text/markdown",
        txt: "text/plain",
      };

      const mimeType = mimeTypeMap[extension] || "text/plain";

      await s3Service.uploadFileToS3(content, s3Key, mimeType);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload file content to storage",
        error: error.message,
      });
    }
  }

  // Create file record
  const file = await File.create({
    name,
    projectId,
    parentId: parentId || null,
    type,
    path: filePath,
    s3Key,
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

  // If it's a file with S3 storage, get content from S3
  let fileContent = file.content;
  if (file.type === "file" && file.s3Key) {
    try {
      const s3Result = await s3Service.downloadFileFromS3(file.s3Key);
      fileContent = s3Result.content;

      // Update file metadata if needed
      if (file.size !== s3Result.size) {
        file.size = s3Result.size;
        file.metadata.lastAccessed = new Date();
        await file.save();
      }
    } catch (error) {
      console.error("Error fetching file from S3:", error);
      // Fall back to database content if S3 fails
    }
  }

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
    // Upload new content to S3
    if (file.s3Key) {
      try {
        await s3Service.uploadFileToS3(content, file.s3Key, file.mimeType);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to update file content in storage",
          error: error.message,
        });
      }
    }

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

  // Update S3 key if path changed
  if (file.type === "file" && file.s3Key && newPath !== oldPath) {
    try {
      const newS3Key = s3Service.generateS3Key(
        file.projectId._id,
        newPath,
        req.user._id
      );

      await s3Service.moveFileInS3(file.s3Key, newS3Key);
      file.s3Key = newS3Key;
    } catch (error) {
      console.error("Error moving file in S3:", error);
      // Continue with database update even if S3 move fails
    }
  }

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

  // Collect S3 keys to delete
  const s3KeysToDelete = [];

  if (file.type === "file" && file.s3Key) {
    s3KeysToDelete.push(file.s3Key);
  } else if (file.type === "folder") {
    // Get all files in the folder recursively
    const getAllFilesInFolder = async (folderId) => {
      const children = await File.find({ parentId: folderId });
      let allFiles = [];

      for (const child of children) {
        if (child.type === "file" && child.s3Key) {
          allFiles.push(child.s3Key);
        } else if (child.type === "folder") {
          const subFiles = await getAllFilesInFolder(child._id);
          allFiles = allFiles.concat(subFiles);
        }
      }

      return allFiles;
    };

    const folderS3Keys = await getAllFilesInFolder(file._id);
    s3KeysToDelete.push(...folderS3Keys);
  }

  // Delete from S3
  if (s3KeysToDelete.length > 0) {
    try {
      await s3Service.deleteMultipleFilesFromS3(s3KeysToDelete);
    } catch (error) {
      console.error("Error deleting files from S3:", error);
      // Continue with database deletion even if S3 deletion fails
    }
  }

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
// @access  Private
const getProjectFileTree = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

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

  if (!file.s3Key) {
    return res.status(400).json({
      success: false,
      message: "File not stored in S3",
    });
  }

  try {
    const result = await s3Service.generatePresignedDownloadUrl(file.s3Key);

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: result.downloadUrl,
        fileName: file.name,
        size: file.size,
        mimeType: file.mimeType,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate download URL",
      error: error.message,
    });
  }
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
};
