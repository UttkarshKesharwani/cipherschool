// Debug authentication for the current user
const jwt = require("jsonwebtoken");
require("dotenv").config();

function debugAuth() {
  console.log("🔐 Authentication Debug\n");

  // You'll need to paste your current token here
  // You can get it from browser localStorage: cipherstudio_token
  const token = "YOUR_TOKEN_HERE"; // Replace with actual token from browser

  if (token === "YOUR_TOKEN_HERE") {
    console.log(
      "❌ Please replace YOUR_TOKEN_HERE with your actual token from browser localStorage"
    );
    console.log("📋 Steps to get your token:");
    console.log("1. Open browser dev tools (F12)");
    console.log("2. Go to Application > Local Storage > http://localhost:5173");
    console.log('3. Find "cipherstudio_token" and copy its value');
    console.log("4. Replace YOUR_TOKEN_HERE in this script");
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token is valid");
    console.log("- User ID:", decoded.userId);
    console.log("- Required Owner ID: 68f764d63759fe9723d52718");
    console.log(
      "- Match:",
      decoded.userId === "68f764d63759fe9723d52718" ? "✅ YES" : "❌ NO"
    );
  } catch (error) {
    console.log("❌ Token error:", error.message);
  }
}

debugAuth();
