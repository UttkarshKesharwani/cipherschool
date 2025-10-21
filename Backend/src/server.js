const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./config/database");
const { errorHandler, notFound } = require("./middleware");

// Route imports
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Trust proxy if behind load balancer/reverse proxy
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:5174",
      "https://localhost:3000",
      "https://localhost:3001",
    ];

    if (process.env.NODE_ENV === "development") {
      allowedOrigins.push(
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
      );
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CipherStudio API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to CipherStudio API",
    description: "A powerful backend for browser-based React IDE",
    documentation: "/api/docs",
    health: "/health",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      projects: "/api/projects",
      files: "/api/files",
    },
  });
});

// API documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    message: "CipherStudio API Documentation",
    baseUrl: `${req.protocol}://${req.get("host")}`,
    endpoints: {
      authentication: {
        register: "POST /api/users/register",
        login: "POST /api/users/login",
        profile: "GET /api/users/profile",
        updateProfile: "PUT /api/users/profile",
        changePassword: "PUT /api/users/change-password",
        stats: "GET /api/users/stats",
      },
      projects: {
        create: "POST /api/projects",
        list: "GET /api/projects",
        getById: "GET /api/projects/:id",
        update: "PUT /api/projects/:id",
        delete: "DELETE /api/projects/:id",
        archive: "PUT /api/projects/:id/archive",
        restore: "PUT /api/projects/:id/restore",
        duplicate: "POST /api/projects/:id/duplicate",
        public: "GET /api/projects/public",
      },
      files: {
        create: "POST /api/files",
        getById: "GET /api/files/:id",
        update: "PUT /api/files/:id",
        delete: "DELETE /api/files/:id",
        move: "PUT /api/files/:id/move",
        download: "GET /api/files/:id/download",
        projectTree: "GET /api/files/project/:projectId/tree",
        search: "GET /api/files/project/:projectId/search",
      },
    },
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <token>",
      note: "Include JWT token in Authorization header for protected routes",
    },
  });
});

// Handle 404 routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 CipherStudio API Server is running!
🌐 Environment: ${process.env.NODE_ENV || "development"}
📊 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
📚 Docs: http://localhost:${PORT}/api/docs
❤️  Health: http://localhost:${PORT}/health
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Promise Rejection:", err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

module.exports = app;
