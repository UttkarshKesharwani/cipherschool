// Test what the backend file tree endpoint actually returns
const axios = require("axios");

async function testFileTreeResponse() {
  // Use a known project ID - you can change this to match your project
  const projectId = "68f7d796af65ce6b45a99f82"; // Valid project ID from user
  const url = `http://localhost:5000/api/files/project/${projectId}/tree`;
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGY3ZDc4NWFmNjVjZTZiNDVhOTlmNzgiLCJpYXQiOjE3NjEwNzMxMDksImV4cCI6MTc2MzY2NTEwOX0.Tl-auIqnUo35B266iTm56dKZk2CG2v52fvl2NEFZq4o";

  console.log("🔍 Testing file tree endpoint:", url);
  console.log("🔑 Using authentication token");

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ SUCCESS!");
    console.log("📊 Full response:", JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.fileTree) {
      const fileTree = response.data.data.fileTree;
      console.log("\n📁 File tree analysis:");
      console.log(
        "- Type:",
        Array.isArray(fileTree) ? "Array" : typeof fileTree
      );
      console.log(
        "- Length/Keys:",
        Array.isArray(fileTree) ? fileTree.length : Object.keys(fileTree).length
      );

      if (Array.isArray(fileTree)) {
        console.log("\n📋 Files in tree:");
        fileTree.forEach((file, index) => {
          console.log(
            `  ${index + 1}. ${file.name} (${file.type}) - Path: ${file.path}`
          );
          if (file.type === "file") {
            console.log(
              `     Content length: ${file.content?.length || 0} characters`
            );
          }
        });
      }
    }
  } catch (error) {
    console.log("❌ FAILED!");
    console.log("Status:", error.response?.status);
    console.log("Error:", error.response?.data?.message || error.message);
    console.log("Full error response:", error.response?.data);
  }
}

testFileTreeResponse();
