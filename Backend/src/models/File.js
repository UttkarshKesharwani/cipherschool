const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      minlength: [1, "File name cannot be empty"],
      maxlength: [255, "File name cannot exceed 255 characters"],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["file", "folder"],
      required: [true, "Type is required"],
      index: true,
    },
    path: {
      type: String,
      required: [true, "Path is required"],
      trim: true,
    },
    s3Key: {
      type: String,
      trim: true,
      default: null, // Only for files, not folders
    },
    content: {
      type: String,
      default: "", // Cached content for quick access
      maxlength: [1000000, "File content too large"], // 1MB limit
    },
    language: {
      type: String,
      trim: true,
      default: "javascript",
      enum: [
        "javascript",
        "typescript",
        "jsx",
        "tsx",
        "css",
        "scss",
        "sass",
        "html",
        "json",
        "markdown",
        "yaml",
        "xml",
        "svg",
        "txt",
        "env",
      ],
    },
    size: {
      type: Number,
      default: 0,
      min: 0,
    },
    encoding: {
      type: String,
      default: "utf8",
      enum: ["utf8", "base64", "binary"],
    },
    mimeType: {
      type: String,
      default: "text/plain",
    },
    isReadOnly: {
      type: Boolean,
      default: false,
    },
    metadata: {
      lastModified: {
        type: Date,
        default: Date.now,
      },
      lastAccessed: {
        type: Date,
        default: Date.now,
      },
      version: {
        type: Number,
        default: 1,
      },
      checksum: {
        type: String,
        default: null,
      },
    },
    permissions: {
      read: {
        type: Boolean,
        default: true,
      },
      write: {
        type: Boolean,
        default: true,
      },
      execute: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for better query performance
fileSchema.index({ projectId: 1, type: 1 });
fileSchema.index({ projectId: 1, parentId: 1 });
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });
fileSchema.index({ projectId: 1, name: 1, parentId: 1 }, { unique: true });

// Virtual for children (if it's a folder)
fileSchema.virtual("children", {
  ref: "File",
  localField: "_id",
  foreignField: "parentId",
});

// Virtual for full path
fileSchema.virtual("fullPath").get(function () {
  return this.path;
});

// Virtual for file extension
fileSchema.virtual("extension").get(function () {
  if (this.type === "folder") return null;
  const parts = this.name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : null;
});

// Virtual for depth level
fileSchema.virtual("depth").get(function () {
  return this.path.split("/").length - 1;
});

// Pre-save middleware
fileSchema.pre("save", function (next) {
  // Update metadata
  if (this.isModified("content")) {
    this.metadata.lastModified = new Date();
    this.metadata.version += 1;
    this.size = Buffer.byteLength(this.content || "", "utf8");
  }

  // Set language based on file extension
  if (this.type === "file" && this.isModified("name")) {
    const ext = this.extension;
    const languageMap = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      css: "css",
      scss: "scss",
      sass: "sass",
      html: "html",
      htm: "html",
      json: "json",
      md: "markdown",
      markdown: "markdown",
      yml: "yaml",
      yaml: "yaml",
      xml: "xml",
      svg: "svg",
      txt: "txt",
      env: "env",
    };

    if (ext && languageMap[ext]) {
      this.language = languageMap[ext];
    }

    // Set MIME type
    const mimeMap = {
      js: "application/javascript",
      jsx: "application/javascript",
      ts: "application/typescript",
      tsx: "application/typescript",
      css: "text/css",
      scss: "text/scss",
      sass: "text/sass",
      html: "text/html",
      htm: "text/html",
      json: "application/json",
      md: "text/markdown",
      markdown: "text/markdown",
      yml: "application/yaml",
      yaml: "application/yaml",
      xml: "application/xml",
      svg: "image/svg+xml",
      txt: "text/plain",
      env: "text/plain",
    };

    if (ext && mimeMap[ext]) {
      this.mimeType = mimeMap[ext];
    }
  }

  next();
});

// Static method to build file tree
fileSchema.statics.buildFileTree = async function (projectId, parentId = null) {
  const files = await this.find({ projectId, parentId }).sort({
    type: -1,
    name: 1,
  }); // Folders first, then alphabetically

  const tree = [];

  for (const file of files) {
    const fileObj = file.toObject();

    if (file.type === "folder") {
      fileObj.children = await this.buildFileTree(projectId, file._id);
    }

    tree.push(fileObj);
  }

  return tree;
};

// Static method to get file by path
fileSchema.statics.findByPath = function (projectId, path) {
  return this.findOne({ projectId, path });
};

// Static method to check if path exists
fileSchema.statics.pathExists = async function (projectId, path) {
  const file = await this.findOne({ projectId, path });
  return !!file;
};

// Static method to find files by pattern
fileSchema.statics.findByPattern = function (projectId, pattern, options = {}) {
  const { type = null, limit = 100 } = options;

  const query = {
    projectId,
    $or: [
      { name: { $regex: pattern, $options: "i" } },
      { path: { $regex: pattern, $options: "i" } },
    ],
  };

  if (type) {
    query.type = type;
  }

  return this.find(query).limit(limit).sort({ type: -1, name: 1 });
};

// Instance method to move file/folder
fileSchema.methods.moveTo = async function (newParentId, newName = null) {
  const oldPath = this.path;
  const newParent = newParentId
    ? await this.constructor.findById(newParentId)
    : null;
  const basePath = newParent ? newParent.path : "";

  this.parentId = newParentId;
  this.name = newName || this.name;
  this.path = basePath ? `${basePath}/${this.name}` : this.name;

  await this.save();

  // Update all children paths if this is a folder
  if (this.type === "folder") {
    await this.updateChildrenPaths(oldPath, this.path);
  }

  return this;
};

// Instance method to update children paths recursively
fileSchema.methods.updateChildrenPaths = async function (
  oldBasePath,
  newBasePath
) {
  const children = await this.constructor.find({ parentId: this._id });

  for (const child of children) {
    const oldChildPath = child.path;
    child.path = child.path.replace(oldBasePath, newBasePath);
    await child.save();

    if (child.type === "folder") {
      await child.updateChildrenPaths(oldChildPath, child.path);
    }
  }
};

// Instance method to delete recursively
fileSchema.methods.deleteRecursively = async function () {
  if (this.type === "folder") {
    const children = await this.constructor.find({ parentId: this._id });
    for (const child of children) {
      await child.deleteRecursively();
    }
  }

  await this.deleteOne();
};

// Instance method to get ancestors
fileSchema.methods.getAncestors = async function () {
  const ancestors = [];
  let current = this;

  while (current.parentId) {
    const parent = await this.constructor.findById(current.parentId);
    if (!parent) break;

    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
};

module.exports = mongoose.model("File", fileSchema);
