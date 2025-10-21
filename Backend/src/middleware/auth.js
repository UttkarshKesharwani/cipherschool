const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check for token in cookies (optional)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Find user by ID
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Account is deactivated.",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token expired.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

// Optional authentication middleware (won't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select("-password");

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Check if user owns the resource
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication required.",
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

// Check if user owns a specific project
const authorizeProject = async (req, res, next) => {
  try {
    const { Project } = require("../models");
    const projectId =
      req.params.id || req.params.projectId || req.body.projectId;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not own this project.",
      });
    }

    req.project = project;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking project ownership.",
      error: error.message,
    });
  }
};

// Check if user owns a specific file
const authorizeFile = async (req, res, next) => {
  try {
    const { File, Project } = require("../models");
    const fileId = req.params.id || req.params.fileId || req.body.fileId;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: "File ID is required.",
      });
    }

    const file = await File.findById(fileId).populate("projectId");

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    if (file.projectId.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not own this file.",
      });
    }

    req.file = file;
    req.project = file.projectId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking file ownership.",
      error: error.message,
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  authorizeProject,
  authorizeFile,
};
