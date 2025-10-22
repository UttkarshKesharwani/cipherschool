# CipherStudio Backend API

A backend API for CipherStudio - a browser-based React IDE that allows users to create, edit, and manage React projects directly in the browser.

## Features

### Core Features

- **User Authentication**: JWT-based authentication with registration and login
- **Project Management**: Create and retrieve React projects
- **File Management**: Create, update, delete, and retrieve files with bulk operations
- **Security**: Basic security measures with CORS and authentication

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: CORS, Basic Rate Limiting
- **Development**: Nodemon

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16.0.0 or higher)
- **MongoDB Atlas account**
- **npm** package manager

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/UttkarshKesharwani/cipherschool.git
cd cipher/Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and configure the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## Project Structure

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
│   └── index.js          # Service exports
└── server.js             # Main application entry point
```

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
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
  isPublic: Boolean,
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
  path: String,
  content: String,
  type: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Features

- **JWT Authentication**: Token-based authentication
- **Password Hashing**: Bcrypt for password security
- **CORS Protection**: Cross-Origin Resource Sharing configuration
- **Basic Rate Limiting**: Prevent API abuse
- **Input Validation**: Basic validation for user inputs

## Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure production MongoDB Atlas instance
4. Configure proper CORS origins

### Recommended Platforms

- **Backend**: Render, Railway, or Heroku
- **Database**: MongoDB Atlas

## License

This project is licensed under the MIT License.

## Author

Built by Uttkarsh Kesharwani
