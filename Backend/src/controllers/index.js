const userController = require("./userController");
const projectController = require("./projectController");
const fileController = require("./fileController");

module.exports = {
  ...userController,
  ...projectController,
  ...fileController,
};
