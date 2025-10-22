// Test script to debug project access issue
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import models
const { Project, User } = require("./src/models");

async function debugProject() {
  try {
    const projectId = "68f774b70d3fb38255779a40";

    console.log("Checking project:", projectId);

    // Find the project
    const project = await Project.findById(projectId).populate("userId");

    if (!project) {
      console.log("❌ Project not found");
      return;
    }

    console.log("✅ Project found:");
    console.log("- Name:", project.name);
    console.log("- Owner:", project.userId.email);
    console.log("- Owner ID:", project.userId._id.toString());
    console.log("- Is Public:", project.isPublic);
    console.log("- Created:", project.createdAt);

    // List all users to see if there's a user mismatch
    const users = await User.find({}).select("email firstName lastName");
    console.log("\n👥 All users in database:");
    users.forEach((user) => {
      console.log(`- ${user.email} (ID: ${user._id.toString()})`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    mongoose.disconnect();
  }
}

debugProject();
