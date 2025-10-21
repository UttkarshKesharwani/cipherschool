const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadAvatar,
  deleteAccount,
  deactivateAccount,
  getUserStats,
} = require("../controllers/userController");

const {
  authenticate,
  authRateLimit,
  apiRateLimit,
  userValidation,
  handleValidationErrors,
} = require("../middleware");

// Public routes
router.post(
  "/register",
  authRateLimit,
  userValidation.register,
  handleValidationErrors,
  registerUser
);

router.post(
  "/login",
  authRateLimit,
  userValidation.login,
  handleValidationErrors,
  loginUser
);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication
router.use(apiRateLimit); // Apply general rate limiting

router.get("/profile", getUserProfile);

router.put(
  "/profile",
  userValidation.updateProfile,
  handleValidationErrors,
  updateUserProfile
);

router.put(
  "/change-password",
  userValidation.changePassword,
  handleValidationErrors,
  changePassword
);

router.post("/avatar", uploadAvatar);

router.get("/stats", getUserStats);

router.put("/deactivate", deactivateAccount);

router.delete("/account", deleteAccount);

module.exports = router;
