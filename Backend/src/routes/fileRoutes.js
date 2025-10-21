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
} = require("../controllers/fileController");

const {
  authenticate,
  authorizeFile,
  apiRateLimit,
  fileRateLimit,
  fileValidation,
  commonValidation,
  handleValidationErrors,
} = require("../middleware");

// All routes require authentication
router.use(authenticate);
router.use(apiRateLimit);

// File CRUD operations
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

// Project-specific file operations
router.get(
  "/project/:projectId/tree",
  commonValidation.mongoId,
  handleValidationErrors,
  getProjectFileTree
);

router.get(
  "/project/:projectId/search",
  commonValidation.mongoId,
  handleValidationErrors,
  searchFiles
);

module.exports = router;
