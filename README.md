# SecureCare Training Dashboard

A comprehensive training and certification management dashboard for healthcare organizations. Track employee certifications, progress, and analytics with an intuitive interface.

## 🚀 Features

- **Employee Management** - Complete employee profiles with training history
- **Training Tracking** - Monitor Level 1, 2, 3, Consultant, and Coach certifications
- **Real-time Analytics** - Live dashboard with completion rates and progress tracking
- **Training Scheduling** - Schedule and reschedule training sessions with date management
- **Conference Approval** - Approve/reject conference attendance requests
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Backend**: Node.js + Express + SQL Server
- **State Management**: React Query + Context API
- **Charts**: Recharts for data visualization

## 📦 Installation

### Prerequisites
- Node.js 18.0+
- SQL Server database

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-care-pathway
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp backend/env.example backend/.env
   
   # Edit backend/.env with your database credentials
   ```

4. **Start the application**
   ```bash
   # Start backend (from backend directory)
   npm start
   
   # Start frontend (from root directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Employees.tsx   # Employee management
│   ├── Training.tsx    # Training management
│   └── Analytics.tsx   # Analytics dashboard
├── hooks/              # Custom React hooks
├── services/           # API services
└── config/             # Configuration files

backend/
├── routes/             # API routes
├── services/           # Business logic
├── config/             # Database configuration
└── scripts/            # Database scripts
```

## 🔧 Configuration

### Database Setup
1. Create a SQL Server database
2. Run the SQL scripts in `backend/scripts/` to create tables
3. Update `backend/.env` with your database connection details

### Environment Variables
```env
DB_SERVER=your-server-name
DB_DATABASE=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
PORT=3001
NODE_ENV=development
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Configure environment variables

## 📊 Database Schema

The application uses two main tables:
- **dbo.Advisor** - Training advisors
- **dbo.SecureCareEmployee** - Employee training records

See `backend/scripts/` for complete schema definitions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for healthcare organizations**
