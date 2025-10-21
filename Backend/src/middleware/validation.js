const { body, param, query } = require("express-validator");

// User validation rules
const userValidation = {
  register: [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Username can only contain letters, numbers, underscores, and hyphens"
      ),

    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),

    body("firstName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("First name cannot exceed 50 characters"),

    body("lastName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),
  ],

  login: [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),

    body("password").notEmpty().withMessage("Password is required"),
  ],

  updateProfile: [
    body("firstName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("First name cannot exceed 50 characters"),

    body("lastName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),

    body("preferences.theme")
      .optional()
      .isIn(["light", "dark"])
      .withMessage("Theme must be either light or dark"),

    body("preferences.autoSave")
      .optional()
      .isBoolean()
      .withMessage("AutoSave must be a boolean"),

    body("preferences.fontSize")
      .optional()
      .isInt({ min: 10, max: 24 })
      .withMessage("Font size must be between 10 and 24"),
  ],

  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),

    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "New password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
  ],
};

// Project validation rules
const projectValidation = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),

    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),

    body("template")
      .optional()
      .isIn(["react", "vanilla", "typescript", "nextjs"])
      .withMessage(
        "Template must be one of: react, vanilla, typescript, nextjs"
      ),

    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),

    body("tags").optional().isArray().withMessage("Tags must be an array"),

    body("tags.*")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Each tag cannot exceed 30 characters"),
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid project ID"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),

    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),

    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),

    body("tags").optional().isArray().withMessage("Tags must be an array"),

    body("tags.*")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Each tag cannot exceed 30 characters"),
  ],

  getById: [param("id").isMongoId().withMessage("Invalid project ID")],

  getUserProjects: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    query("search")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Search query cannot exceed 100 characters"),

    query("includeArchived")
      .optional()
      .isBoolean()
      .withMessage("includeArchived must be a boolean"),
  ],
};

// File validation rules
const fileValidation = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("File name must be between 1 and 255 characters")
      .matches(/^[^<>:"/\\|?*\x00-\x1f]+$/)
      .withMessage("File name contains invalid characters"),

    body("projectId").isMongoId().withMessage("Invalid project ID"),

    body("parentId").optional().isMongoId().withMessage("Invalid parent ID"),

    body("type")
      .isIn(["file", "folder"])
      .withMessage("Type must be either file or folder"),

    body("content")
      .optional()
      .isString()
      .withMessage("Content must be a string"),

    body("language")
      .optional()
      .isIn([
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
      ])
      .withMessage("Invalid language specified"),
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid file ID"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("File name must be between 1 and 255 characters")
      .matches(/^[^<>:"/\\|?*\x00-\x1f]+$/)
      .withMessage("File name contains invalid characters"),

    body("content")
      .optional()
      .isString()
      .withMessage("Content must be a string"),

    body("parentId").optional().isMongoId().withMessage("Invalid parent ID"),
  ],

  getById: [param("id").isMongoId().withMessage("Invalid file ID")],

  move: [
    param("id").isMongoId().withMessage("Invalid file ID"),

    body("parentId").optional().isMongoId().withMessage("Invalid parent ID"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("File name must be between 1 and 255 characters"),
  ],
};

// Common validation rules
const commonValidation = {
  mongoId: [param("id").isMongoId().withMessage("Invalid ID format")],

  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
};

module.exports = {
  userValidation,
  projectValidation,
  fileValidation,
  commonValidation,
};
