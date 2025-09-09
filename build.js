#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Cross-platform file operations
const isWindows = process.platform === 'win32';

function copyFile(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyFile(srcPath, destPath);
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, 'backend');

console.log('🚀 Building SecureCare Application...\n');

// Step 1: Build Frontend (now outputs directly to backend/dist)
console.log('📦 Building Frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Frontend build completed (output to backend/dist)\n');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Install Backend Dependencies
console.log('📦 Installing Backend Dependencies...');
try {
  execSync('npm install --production', { stdio: 'inherit', cwd: backendDir });
  console.log('✅ Backend dependencies installed\n');
} catch (error) {
  console.error('❌ Backend dependency installation failed:', error.message);
  process.exit(1);
}

// Step 3: Update Backend Server to Serve Frontend
console.log('🔧 Updating Backend Server...');
const updatedServerContent = `const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure MIME types for proper static file serving
express.static.mime.define({
  'application/javascript': ['js'],
  'text/css': ['css'],
  'application/json': ['json'],
  'application/manifest+json': ['webmanifest'],
  'image/svg+xml': ['svg'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/ico': ['ico'],
  'text/plain': ['txt']
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    // Set proper MIME types for JavaScript modules
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    // Set proper MIME type for CSS
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    // Set proper MIME type for web manifest
    if (filePath.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
    // Set proper MIME type for SVG
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Import routes
const secureCareRoutes = require('./routes/securecare');

// API routes
app.use('/api/securecare', secureCareRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SecureCare API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'SecureCare Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      securecare: '/api/securecare'
    }
  });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 SecureCare Application running on port \${PORT}\`);
  console.log(\`📱 Frontend: http://localhost:\${PORT}\`);
  console.log(\`🔧 API: http://localhost:\${PORT}/api\`);
});

module.exports = app;
`;

fs.writeFileSync(path.join(backendDir, 'server.js'), updatedServerContent);
console.log('✅ Backend server updated to serve frontend');

// Step 4: Update Backend Package.json
console.log('📄 Updating Backend Package.json...');
const backendPackagePath = path.join(backendDir, 'package.json');
const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));

// Update package.json for production
backendPackage.scripts = {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "echo \"Error: no test specified\" && exit 1",
  "import:csv": "node import-csv.js"
};

backendPackage.description = "SecureCare Training Management System - Production Build";
backendPackage.engines = {
  "node": ">=18.0.0"
};

fs.writeFileSync(
  backendPackagePath, 
  JSON.stringify(backendPackage, null, 2)
);
console.log('✅ Backend package.json updated');

// Step 5: Create Environment Template
console.log('🔐 Creating Environment Template...');
const envTemplate = `# SecureCare Production Environment
# Copy this file to .env and update with your actual values

# Database Configuration
DB_SERVER=localhost
DB_DATABASE=SecureCare
DB_USER=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=8080
NODE_ENV=production

# CORS Configuration (comma-separated origins)
CORS_ORIGINS=http://localhost:8080,https://your-app-name.azurewebsites.net
`;

fs.writeFileSync(path.join(backendDir, '.env.example'), envTemplate);
console.log('✅ Environment template created');

// Step 6: Create README for Production
console.log('📖 Creating Production README...');
const productionReadme = `# SecureCare Application - Production Build

This is a production-ready build of the SecureCare Training Management System with integrated frontend and backend.

## Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database and server settings
   \`\`\`

3. **Start the Application**
   \`\`\`bash
   npm start
   \`\`\`

4. **Access the Application**
   - Frontend: http://localhost:8080
   - API: http://localhost:8080/api

## Features

- ✅ Complete React Frontend (served from backend/dist)
- ✅ Express.js Backend API
- ✅ SQL Server Database Integration
- ✅ Production Optimized
- ✅ Single Command Deployment
- ✅ Integrated Frontend and Backend

## Configuration

### Database Setup
Ensure your SQL Server database is running and accessible with the credentials in your \`.env\` file.

### Environment Variables
- \`DB_SERVER\`: SQL Server hostname
- \`DB_DATABASE\`: Database name
- \`DB_USER\`: Database username
- \`DB_PASSWORD\`: Database password
- \`PORT\`: Server port (default: 8080)

## Project Structure

\`\`\`
backend/
├── dist/                 # Frontend build files
├── config/              # Database configuration
├── routes/              # API routes
├── services/            # Business logic
├── scripts/             # Database scripts
├── server.js            # Main server file (serves frontend + API)
├── package.json         # Dependencies
└── .env.example         # Environment template
\`\`\`

## Deployment

This build is ready for deployment to:
- Heroku
- Railway
- DigitalOcean
- AWS
- Any Node.js hosting platform

## Support

For support, contact the SecureCare development team.
`;

fs.writeFileSync(path.join(backendDir, 'README.md'), productionReadme);
console.log('✅ Production README created');

// Step 8: Copy server.js and package.json to root for Azure
console.log('📁 Copying server files to root...');
try {
  // Copy server.js to root
  const serverSrc = path.join(backendDir, 'server.js');
  const serverDest = path.join(__dirname, 'server.js');
  if (fs.existsSync(serverSrc)) {
    fs.copyFileSync(serverSrc, serverDest);
    console.log('✅ server.js copied to roots');  
  } else {
    console.log('❌ server.js not found in backend directory');
  }
  
  // Copy package.json to root
  const packageSrc = path.join(backendDir, 'package.json');
  const packageDest = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageSrc)) {
    fs.copyFileSync(packageSrc, packageDest);
    console.log('✅ package.json copied to root');
  } else {
    console.log('❌ package.json not found in backend directory');
  }
} catch (error) {
  console.error('❌ Error copying files to root:', error.message);
}

console.log('\n🎉 Build completed successfully!');
console.log('\n📁 Production files are in the "backend" directory');
console.log('\n🚀 To run the production app:');
console.log('   cd backend');
console.log('   npm install');
console.log('   cp .env.example .env');
console.log('   # Edit .env with your settings');
console.log('   npm start');
console.log('\n🌐 Application will be available at http://localhost:8080');
