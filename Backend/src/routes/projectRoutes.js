const express = require("express");
const router = express.Router();
const {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  duplicateProject,
  getPublicProjects,
} = require("../controllers/projectController");

const {
  authenticate,
  optionalAuth,
  authorizeProject,
  apiRateLimit,
  projectRateLimit,
  projectValidation,
  commonValidation,
  handleValidationErrors,
} = require("../middleware");

// Public routes
router.get(
  "/public",
  optionalAuth,
  projectValidation.getUserProjects,
  handleValidationErrors,
  getPublicProjects
);

// Protected routes (require authentication)
router.use(authenticate);
router.use(apiRateLimit);

// Project CRUD operations
router.post(
  "/",
  projectRateLimit,
  projectValidation.create,
  handleValidationErrors,
  createProject
);

router.get(
  "/",
  projectValidation.getUserProjects,
  handleValidationErrors,
  getUserProjects
);

router.get(
  "/:id",
  projectValidation.getById,
  handleValidationErrors,
  getProjectById
);

router.put(
  "/:id",
  projectValidation.update,
  handleValidationErrors,
  authorizeProject,
  updateProject
);

router.delete(
  "/:id",
  commonValidation.mongoId,
  handleValidationErrors,
  authorizeProject,
  deleteProject
);

// Project management operations
router.put(
  "/:id/archive",
  commonValidation.mongoId,
  handleValidationErrors,
  authorizeProject,
  archiveProject
);

router.put(
  "/:id/restore",
  commonValidation.mongoId,
  handleValidationErrors,
  authorizeProject,
  restoreProject
);

router.post(
  "/:id/duplicate",
  commonValidation.mongoId,
  handleValidationErrors,
  duplicateProject
);

module.exports = router;
