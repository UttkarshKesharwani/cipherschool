const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [1, "Project name cannot be empty"],
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    template: {
      type: String,
      enum: ["react", "vanilla", "typescript", "nextjs"],
      default: "react",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    settings: {
      autoSave: {
        type: Boolean,
        default: true,
      },
      autoSaveInterval: {
        type: Number,
        default: 5000, // 5 seconds
        min: 1000,
        max: 60000,
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto",
      },
      fontSize: {
        type: Number,
        default: 14,
        min: 10,
        max: 24,
      },
      wordWrap: {
        type: Boolean,
        default: true,
      },
      minimap: {
        type: Boolean,
        default: true,
      },
    },
    packageJson: {
      type: mongoose.Schema.Types.Mixed,
      default: {
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
    },
    metadata: {
      totalFiles: {
        type: Number,
        default: 0,
      },
      totalSize: {
        type: Number,
        default: 0, // in bytes
      },
      lastModified: {
        type: Date,
        default: Date.now,
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, isArchived: 1 });
projectSchema.index({ isPublic: 1, createdAt: -1 });
projectSchema.index({ tags: 1 });

// Virtual for files
projectSchema.virtual("files", {
  ref: "File",
  localField: "_id",
  foreignField: "projectId",
});

// Virtual for files count
projectSchema.virtual("filesCount", {
  ref: "File",
  localField: "_id",
  foreignField: "projectId",
  count: true,
});

// Pre-save middleware to update metadata
projectSchema.pre("save", function (next) {
  if (this.isModified("metadata.lastModified")) {
    this.metadata.lastModified = new Date();
  }
  next();
});

// Static method to find user's projects
projectSchema.statics.findUserProjects = function (userId, options = {}) {
  const {
    includeArchived = false,
    sort = { createdAt: -1 },
    limit = 20,
    skip = 0,
    search = "",
  } = options;

  const query = { userId };

  if (!includeArchived) {
    query.isArchived = false;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate("userId", "username email firstName lastName");
};

// Instance method to archive project
projectSchema.methods.archive = async function () {
  this.isArchived = true;
  this.archivedAt = new Date();
  return await this.save();
};

// Instance method to restore project
projectSchema.methods.restore = async function () {
  this.isArchived = false;
  this.archivedAt = null;
  return await this.save();
};

// Instance method to update project settings
projectSchema.methods.updateSettings = async function (newSettings) {
  this.settings = { ...this.settings.toObject(), ...newSettings };
  this.metadata.lastModified = new Date();
  return await this.save();
};

module.exports = mongoose.model("Project", projectSchema);
