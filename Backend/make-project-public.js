// Make the specific project public so you can access it
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const { Project } = require("./src/models");

async function makeProjectPublic() {
  try {
    const projectId = "68f774b70d3fb38255779a40";

    const result = await Project.findByIdAndUpdate(
      projectId,
      { isPublic: true },
      { new: true }
    );

    if (result) {
      console.log("✅ Project is now public and accessible!");
      console.log("🌐 You can now fetch it regardless of authentication");
    } else {
      console.log("❌ Project not found");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    mongoose.disconnect();
  }
}

makeProjectPublic();
