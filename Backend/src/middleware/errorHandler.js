const { validationResult } = require("express-validator");

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    });
  }

  next();
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Invalid resource ID format";
    error = { message, statusCode: 400 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  // File upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File size too large";
    error = { message, statusCode: 400 };
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field";
    error = { message, statusCode: 400 };
  }

  // AWS S3 errors
  if (err.code === "NoSuchBucket") {
    const message = "S3 bucket not found";
    error = { message, statusCode: 500 };
  }

  if (err.code === "AccessDenied") {
    const message = "S3 access denied";
    error = { message, statusCode: 500 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Handle 404 routes
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  handleValidationErrors,
  errorHandler,
  notFound,
  asyncHandler,
};
