# SecureCare Training Dashboard

A comprehensive HR-friendly training and certification management dashboard built with React, TypeScript, and modern UI components. Track employee certifications, progress, and analytics in real-time with an intuitive interface designed for healthcare organizations.

![SecureCare Dashboard](https://img.shields.io/badge/React-18.0+-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0+-38B2AC.svg)
![Vite](https://img.shields.io/badge/Vite-4.0+-646CFF.svg)

## 🚀 Features

### 📊 **Dashboard & Analytics**
- **Real-time Statistics** - Live overview of training completion rates
- **Interactive Charts** - Bar charts, pie charts, and area charts for data visualization
- **Facility Performance** - Compare training metrics across different locations
- **Progress Tracking** - Monitor individual and team certification progress

### 👥 **Employee Management**
- **Employee Directory** - Complete employee profiles with training history
- **Certification Tracking** - Monitor Level 1, 2, 3, Consultant, and Coach certifications
- **Training Assignment** - Assign and schedule training modules
- **Status Management** - Track pending, in-progress, and completed training

### 📈 **Advanced Analytics**
- **Time-based Filtering** - Filter data by year, 6 months, 3 months, or custom date ranges
- **Level-based Analysis** - Analyze performance by certification levels
- **Facility Comparison** - Compare training metrics across facilities
- **Export Capabilities** - Download data in CSV format for further analysis

### 📋 **Custom Reports**
- **Report Builder** - Create custom reports with drag-and-drop interface
- **Multiple Formats** - Generate tables, charts, and summary reports
- **Advanced Filtering** - Filter by date ranges, facilities, certification levels
- **Template System** - Save and reuse report configurations
- **Export Options** - Export to CSV, PDF, or print directly

### 🎓 **Training Management**
- **Training Scheduling** - Schedule and reschedule training sessions
- **Progress Monitoring** - Track completion status in real-time
- **Date Management** - Flexible date picker for training assignments
- **Status Updates** - Mark training as complete or reschedule as needed

### 🎨 **Modern UI/UX**
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Mode** - Toggle between themes for user preference
- **Accessibility** - Screen reader support and keyboard navigation
- **Performance Optimized** - Fast loading with lazy loading and code splitting

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn/ui components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Routing**: React Router v6
- **State Management**: React Context API
- **Date Handling**: date-fns
- **Animations**: Framer Motion

## 📦 Installation

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-care-pathway
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to view the application

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui components
│   ├── magicui/        # Magic UI components
│   └── AppSidebar.tsx  # Navigation sidebar
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Main dashboard view
│   ├── Employees.tsx   # Employee management
│   ├── Training.tsx    # Training management
│   ├── Analytics.tsx   # Advanced analytics
│   ├── Reports.tsx     # Custom report builder
│   └── Settings.tsx    # Application settings
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── layouts/            # Layout components
└── index.css           # Global styles
```

## 🎯 Key Features Explained

### **Dashboard Overview**
The main dashboard provides a comprehensive view of training metrics:
- **Total Employees**: Current employee count
- **Completion Rates**: Percentage of employees at each certification level
- **Overdue Training**: Employees with pending training assignments
- **Facility Performance**: Training completion by facility

### **Employee Management**
- **Employee List**: View all employees with their current training status
- **Individual Profiles**: Detailed view of each employee's training history
- **Bulk Operations**: Assign training to multiple employees simultaneously
- **Status Updates**: Mark training as complete or reschedule

### **Training Scheduling**
- **Date Picker**: Intuitive calendar interface for scheduling
- **Status Management**: Track scheduled, in-progress, and completed training
- **Rescheduling**: Easy rescheduling with confirmation dialogs
- **Progress Tracking**: Real-time updates on training completion

### **Custom Reports**
- **Report Builder**: Visual interface for creating custom reports
- **Multiple Formats**: Tables, charts, and summary views
- **Advanced Filtering**: Filter by date ranges, facilities, and certification levels
- **Template System**: Save and reuse report configurations
- **Export Options**: Download reports in various formats

### **Analytics Dashboard**
- **Time-based Analysis**: Filter data by different time periods
- **Level Comparison**: Compare performance across certification levels
- **Facility Metrics**: Analyze training completion by facility
- **Trend Analysis**: Track progress over time

## 🎨 Design System

The application uses a custom design system built with Tailwind CSS:

### **Color Palette**
- **Primary**: Soft Lavender (#8b5cf6)
- **Secondary**: Light Lavender (#e9d5ff)
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Error**: Red (#ef4444)

### **Typography**
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400, 500, 600, 700
- **Responsive**: Scales appropriately across devices

### **Components**
- **Cards**: Consistent card design with hover effects
- **Buttons**: Multiple variants (primary, secondary, outline)
- **Tables**: Responsive tables with sorting and filtering
- **Charts**: Interactive charts with tooltips and legends

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured experience with sidebar navigation
- **Tablet**: Adapted layout with collapsible sidebar
- **Mobile**: Touch-friendly interface with bottom navigation

## 🔧 Configuration

### **Environment Variables**
Create a `.env` file in the root directory:

```env
VITE_APP_TITLE=SecureCare Training Dashboard
VITE_API_URL=your-api-endpoint
```

### **Customization**
- **Colors**: Modify the color palette in `src/index.css`
- **Components**: Customize UI components in `src/components/ui/`
- **Data**: Update sample data in `src/hooks/useEmployees.ts`

## 🚀 Deployment

### **Build for Production**
```bash
npm run build
# or
yarn build
```

### **Preview Production Build**
```bash
npm run preview
# or
yarn preview
```

### **Deploy to Vercel**
1. Connect your repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy automatically on push to main branch

## 📊 Data Structure

### **Employee Object**
```typescript
interface Employee {
  employeeId: string;
  name: string;
  email: string;
  facility: string;
  area: string;
  level1Awarded: boolean;
  level1AwardedDate?: Date;
  level2Awarded: boolean;
  level2AwardedDate?: Date;
  level3Awarded: boolean;
  level3AwardedDate?: Date;
  consultantAwarded: boolean;
  consultantAwardedDate?: Date;
  coachAwarded: boolean;
  coachAwardedDate?: Date;
  level1ReliasAssigned?: Date;
  level2ReliasAssigned?: Date;
  level3ReliasAssigned?: Date;
  consultantReliasAssigned?: Date;
  coachReliasAssigned?: Date;
}
```

## 🔒 Security Features

- **Input Validation**: All user inputs are validated
- **XSS Protection**: Sanitized data rendering
- **CSRF Protection**: Built-in CSRF token handling
- **Secure Headers**: Proper security headers configuration

## 🧪 Testing

### **Run Tests**
```bash
npm run test
# or
yarn test
```

### **Test Coverage**
```bash
npm run test:coverage
# or
yarn test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- **Shadcn/ui** for the excellent component library
- **Recharts** for the powerful charting capabilities
- **Tailwind CSS** for the utility-first CSS framework
- **Vite** for the fast build tool
- **React Team** for the amazing framework
- **Lucide React** for the beautiful icon library

---

**Built with ❤️ for healthcare organizations**
