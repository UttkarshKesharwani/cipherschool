const rateLimit = require("express-rate-limit");

// General rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limit
const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // limit each IP to 1000 requests per windowMs (increased for development)
  "Too many API requests, please try again later"
);

// Strict rate limit for auth endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  "Too many authentication attempts, please try again later"
);

// File operation rate limit
const fileRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  50, // limit each IP to 50 file operations per minute
  "Too many file operations, please slow down"
);

// Project creation rate limit
const projectRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // limit each IP to 10 project creations per hour
  "Too many projects created, please wait before creating more"
);

module.exports = {
  apiRateLimit,
  authRateLimit,
  fileRateLimit,
  projectRateLimit,
};
