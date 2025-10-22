const express = require("express");
const router = express.Router();
const {
  createFile,
  getFileById,
  updateFile,
  deleteFile,
  getProjectFileTree,
  moveFile,
  searchFiles,
  getFileDownloadUrl,
  bulkUpdateFiles,
} = require("../controllers/fileController");

const {
  authenticate,
  optionalAuth,
  authorizeFile,
  apiRateLimit,
  fileRateLimit,
  fileValidation,
  commonValidation,
  handleValidationErrors,
} = require("../middleware");

// Project-specific file operations (allow public access for public projects)
router.get(
  "/project/:projectId/tree",
  optionalAuth,
  apiRateLimit,
  (req, res, next) => {
    // Validate projectId parameter
    const { param } = require("express-validator");
    param("projectId").isMongoId().withMessage("Invalid project ID format")(
      req,
      res,
      next
    );
  },
  handleValidationErrors,
  getProjectFileTree
);

router.get(
  "/project/:projectId/search",
  optionalAuth,
  apiRateLimit,
  (req, res, next) => {
    // Validate projectId parameter
    const { param } = require("express-validator");
    param("projectId").isMongoId().withMessage("Invalid project ID format")(
      req,
      res,
      next
    );
  },
  handleValidationErrors,
  searchFiles
);

// All other routes require authentication
router.use(authenticate);

// File CRUD operations
router.use(apiRateLimit);

// Bulk update files for a project
router.put(
  "/project/:projectId/bulk",
  fileRateLimit,
  (req, res, next) => {
    // Validate projectId parameter
    const { param } = require("express-validator");
    param("projectId").isMongoId().withMessage("Invalid project ID format")(
      req,
      res,
      next
    );
  },
  handleValidationErrors,
  bulkUpdateFiles
);

router.post(
  "/",
  fileRateLimit,
  fileValidation.create,
  handleValidationErrors,
  createFile
);

router.get("/:id", fileValidation.getById, handleValidationErrors, getFileById);

router.put(
  "/:id",
  fileRateLimit,
  fileValidation.update,
  handleValidationErrors,
  authorizeFile,
  updateFile
);

router.delete(
  "/:id",
  commonValidation.mongoId,
  handleValidationErrors,
  authorizeFile,
  deleteFile
);

// File operations
router.put(
  "/:id/move",
  fileValidation.move,
  handleValidationErrors,
  authorizeFile,
  moveFile
);

router.get(
  "/:id/download",
  commonValidation.mongoId,
  handleValidationErrors,
  getFileDownloadUrl
);

module.exports = router;
