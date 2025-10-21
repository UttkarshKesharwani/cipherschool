const auth = require("./auth");
const errorHandler = require("./errorHandler");
const rateLimiting = require("./rateLimiting");
const validation = require("./validation");

module.exports = {
  ...auth,
  ...errorHandler,
  ...rateLimiting,
  ...validation,
};
