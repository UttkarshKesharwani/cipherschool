# CipherStudio

A browser-based React IDE that allows users to create, edit, and manage React projects directly in the browser with live preview capabilities.

## Features

### Frontend Features

- **Monaco Code Editor**: Professional code editing experience with syntax highlighting
- **Live Preview**: Real-time preview of React applications using Sandpack
- **File Management**: Create, edit, delete, and organize project files
- **Project Management**: Create and switch between multiple projects
- **User Authentication**: Registration, login, and user profile management
- **Responsive Design**: Works on desktop and tablet devices
- **Auto-save**: Automatic saving of project changes
- **Theme Support**: Light and dark theme options

### Backend Features

- **REST API**: Complete API for user and project management
- **JWT Authentication**: Secure token-based authentication
- **MongoDB Database**: Persistent storage for users, projects, and files
- **File Operations**: Bulk file operations and project tree management
- **CORS Support**: Cross-origin resource sharing for frontend integration

## Tech Stack

### Frontend

- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **Monaco Editor**: VS Code's editor component
- **Sandpack**: CodeSandbox's in-browser bundler for live preview
- **React Router**: Client-side routing

### Backend

- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing

## Getting Started

### Prerequisites

- Node.js (v16.0.0 or higher)
- MongoDB Atlas account
- npm package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/UttkarshKesharwani/cipherschool.git
cd cipher
```

2. Install backend dependencies:

```bash
cd Backend
npm install
```

3. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

4. Configure environment variables:

Create `.env` file in the Backend directory:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:3000
```

Create `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Running the Application

1. Start the backend server:

```bash
cd Backend
npm run dev
```

2. Start the frontend development server:

```bash
cd frontend
npm run dev
```

3. Open http://localhost:3000 in your browser

## Project Structure

```
cipher/
├── Backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   └── server.js       # Main server file
│   ├── package.json
│   └── README.md
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utility libraries
│   │   ├── styles/         # CSS styles
│   │   └── main.jsx        # Main React entry
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Author

Built by Uttkarsh Kesharwani
