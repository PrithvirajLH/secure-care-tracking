# SecureCare Application - Production Build

This is a production-ready build of the SecureCare Training Management System with integrated frontend and backend.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database and server settings
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3001
   - API: http://localhost:3001/api

## Features

- ✅ Complete React Frontend (served from backend/dist)
- ✅ Express.js Backend API
- ✅ SQL Server Database Integration
- ✅ Production Optimized
- ✅ Single Command Deployment
- ✅ Integrated Frontend and Backend

## Configuration

### Database Setup
Ensure your SQL Server database is running and accessible with the credentials in your `.env` file.

### Environment Variables
- `DB_SERVER`: SQL Server hostname
- `DB_DATABASE`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `PORT`: Server port (default: 3001)

## Project Structure

```
backend/
├── dist/                 # Frontend build files
├── config/              # Database configuration
├── routes/              # API routes
├── services/            # Business logic
├── scripts/             # Database scripts
├── server.js            # Main server file (serves frontend + API)
├── package.json         # Dependencies
└── .env.example         # Environment template
```

## Deployment

This build is ready for deployment to:
- Heroku
- Railway
- DigitalOcean
- AWS
- Any Node.js hosting platform

## Support

For support, contact the SecureCare development team.
