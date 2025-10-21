const { User } = require("../models");
const { generateToken } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? "email" : "username";
    return res.status(400).json({
      success: false,
      message: `User with this ${field} already exists`,
    });
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
  });

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and include password
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account is deactivated. Please contact support.",
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("projectsCount");

  res.status(200).json({
    success: true,
    data: {
      user: user.toJSON(),
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, preferences } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Update fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (preferences) {
    user.preferences = { ...user.preferences.toObject(), ...preferences };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: user.toJSON(),
    },
  });
});

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Update avatar URL (assuming file is uploaded to S3)
  user.avatar = req.file.location || req.file.path;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Avatar uploaded successfully",
    data: {
      avatarUrl: user.avatar,
    },
  });
});

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "Password is incorrect",
    });
  }

  // Delete all user's projects and files
  const { Project, File } = require("../models");

  const userProjects = await Project.find({ userId: user._id });

  for (const project of userProjects) {
    // Delete all files in the project
    await File.deleteMany({ projectId: project._id });

    // Delete the project
    await Project.findByIdAndDelete(project._id);
  }

  // Delete user account
  await User.findByIdAndDelete(user._id);

  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});

// @desc    Deactivate user account
// @route   PUT /api/users/deactivate
// @access  Private
const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Account deactivated successfully",
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res) => {
  const { Project, File } = require("../models");

  const userId = req.user._id;

  // Get statistics
  const [
    totalProjects,
    totalFiles,
    publicProjects,
    archivedProjects,
    recentProjects,
  ] = await Promise.all([
    Project.countDocuments({ userId }),
    File.countDocuments({
      projectId: {
        $in: await Project.find({ userId }).distinct("_id"),
      },
    }),
    Project.countDocuments({ userId, isPublic: true }),
    Project.countDocuments({ userId, isArchived: true }),
    Project.find({ userId, isArchived: false })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("name description updatedAt"),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalProjects,
        totalFiles,
        publicProjects,
        archivedProjects,
      },
      recentProjects,
    },
  });
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadAvatar,
  deleteAccount,
  deactivateAccount,
  getUserStats,
};
