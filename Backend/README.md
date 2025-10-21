# CipherStudio Backend API

A powerful and scalable backend API for CipherStudio - a browser-based React IDE that allows users to create, edit, and manage React projects directly in the browser.

## 🚀 Features

### Core Features

- **User Authentication**: JWT-based authentication with secure registration and login
- **Project Management**: Create, update, delete, archive, and duplicate React projects
- **File Management**: Full CRUD operations for files and folders with nested folder support
- **AWS S3 Integration**: Secure file storage and retrieval using Amazon S3
- **Real-time Collaboration**: Foundation for real-time file editing capabilities
- **Security**: Rate limiting, input validation, and comprehensive security measures

### Additional Features

- **Project Templates**: Pre-built React project templates
- **File Search**: Search files within projects by name or content
- **Project Statistics**: Track project metrics and user statistics
- **Public Projects**: Share projects publicly with read-only access
- **File Download**: Generate secure download URLs for project files

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: AWS S3
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Development**: Nodemon, Morgan

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16.0.0 or higher)
- **MongoDB** (v4.4 or higher) or MongoDB Atlas account
- **AWS S3** bucket for file storage
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cipherstudio-backend.git
cd cipherstudio-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and configure the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/cipherstudio
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cipherstudio?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRE=30d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=cipherstudio-files

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. AWS S3 Setup

1. Create an AWS S3 bucket
2. Configure bucket permissions for your application
3. Create IAM user with S3 access permissions
4. Add the credentials to your `.env` file

### 5. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Endpoints Overview

#### 🔐 Authentication (`/api/users`)

- `POST /register` - Register a new user
- `POST /login` - User login
- `GET /profile` - Get user profile (Protected)
- `PUT /profile` - Update user profile (Protected)
- `PUT /change-password` - Change password (Protected)
- `GET /stats` - Get user statistics (Protected)

#### 📁 Projects (`/api/projects`)

- `POST /` - Create a new project (Protected)
- `GET /` - Get user's projects (Protected)
- `GET /:id` - Get project by ID (Protected)
- `PUT /:id` - Update project (Protected)
- `DELETE /:id` - Delete project (Protected)
- `PUT /:id/archive` - Archive project (Protected)
- `PUT /:id/restore` - Restore project (Protected)
- `POST /:id/duplicate` - Duplicate project (Protected)
- `GET /public` - Get public projects

#### 📄 Files (`/api/files`)

- `POST /` - Create file or folder (Protected)
- `GET /:id` - Get file content (Protected)
- `PUT /:id` - Update file content (Protected)
- `DELETE /:id` - Delete file or folder (Protected)
- `PUT /:id/move` - Move file or folder (Protected)
- `GET /:id/download` - Get file download URL (Protected)
- `GET /project/:projectId/tree` - Get project file tree (Protected)
- `GET /project/:projectId/search` - Search files in project (Protected)

### Example API Calls

#### Register a User

```bash
curl -X POST http://localhost:5000/api/users/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Create a Project

```bash
curl -X POST http://localhost:5000/api/projects \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your_token>" \\
  -d '{
    "name": "My React App",
    "description": "A new React application",
    "template": "react",
    "isPublic": false
  }'
```

#### Create a File

```bash
curl -X POST http://localhost:5000/api/files \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your_token>" \\
  -d '{
    "name": "App.js",
    "projectId": "project_id_here",
    "type": "file",
    "content": "import React from '\''react'\'';\\n\\nfunction App() {\\n  return <div>Hello World</div>;\\n}\\n\\nexport default App;",
    "language": "jsx"
  }'
```

## 🗂 Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── userController.js    # User management logic
│   ├── projectController.js # Project management logic
│   ├── fileController.js    # File management logic
│   └── index.js            # Controller exports
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Error handling middleware
│   ├── rateLimiting.js     # Rate limiting configuration
│   ├── validation.js       # Input validation rules
│   └── index.js           # Middleware exports
├── models/
│   ├── User.js            # User schema and model
│   ├── Project.js         # Project schema and model
│   ├── File.js            # File schema and model
│   └── index.js          # Model exports
├── routes/
│   ├── userRoutes.js      # User-related routes
│   ├── projectRoutes.js   # Project-related routes
│   ├── fileRoutes.js      # File-related routes
│   └── index.js          # Route exports
├── services/
│   ├── s3Service.js       # AWS S3 integration
│   └── index.js          # Service exports
└── server.js             # Main application entry point
```

## 🗄 Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  avatar: String,
  isActive: Boolean,
  lastLogin: Date,
  preferences: {
    theme: String,
    autoSave: Boolean,
    fontSize: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Projects Collection

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  userId: ObjectId (ref: User),
  template: String,
  isPublic: Boolean,
  tags: [String],
  settings: {
    autoSave: Boolean,
    autoSaveInterval: Number,
    theme: String,
    fontSize: Number,
    wordWrap: Boolean,
    minimap: Boolean
  },
  packageJson: Object,
  metadata: {
    totalFiles: Number,
    totalSize: Number,
    lastModified: Date
  },
  isArchived: Boolean,
  archivedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Files Collection

```javascript
{
  _id: ObjectId,
  name: String,
  projectId: ObjectId (ref: Project),
  parentId: ObjectId (ref: File),
  type: String, // 'file' or 'folder'
  path: String,
  s3Key: String,
  content: String,
  language: String,
  size: Number,
  encoding: String,
  mimeType: String,
  isReadOnly: Boolean,
  metadata: {
    lastModified: Date,
    lastAccessed: Date,
    version: Number,
    checksum: String
  },
  permissions: {
    read: Boolean,
    write: Boolean,
    execute: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds for password security
- **Rate Limiting**: Prevent API abuse with configurable rate limits
- **Input Validation**: Comprehensive validation for all user inputs
- **CORS Protection**: Configurable Cross-Origin Resource Sharing
- **Helmet Security**: HTTP headers security middleware
- **File Upload Security**: Secure file handling and storage

## 🚀 Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure production MongoDB instance
4. Set up production AWS S3 bucket
5. Configure proper CORS origins

### Recommended Platforms

- **Backend**: Render, Railway, Cyclic, or Heroku
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Monitoring and Logging

- **Morgan**: HTTP request logging
- **Error Handling**: Comprehensive error tracking
- **Health Checks**: `/health` endpoint for monitoring
- **Performance**: Compression middleware for better performance

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email your-email@example.com or create an issue in the GitHub repository.

## 🔮 Future Enhancements

- [ ] Real-time collaboration using WebSockets
- [ ] File versioning and history
- [ ] Project sharing with permissions
- [ ] Code execution in sandboxed environment
- [ ] Integration with external APIs
- [ ] Advanced search capabilities
- [ ] File compression and optimization
- [ ] Backup and restore functionality

---

**Built with ❤️ for CipherStudio IDE**
