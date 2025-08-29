import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Award, 
  Clock, 
  AlertTriangle,
  Building,
  MapPin,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target
} from "lucide-react";

export default function Analytics() {
  const { state } = useApp();
  const [timeRange, setTimeRange] = useState<string>("1y");
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  // Helper functions for advanced analytics
  const calculateAverageCompletionTime = (employees: any[]) => {
    const completedEmployees = employees.filter(e => e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate);
    if (completedEmployees.length === 0) return 0;
    
    const totalDays = completedEmployees.reduce((sum, emp) => {
      const dates = [emp.level1AwardedDate, emp.level2AwardedDate, emp.level3AwardedDate]
        .filter(date => date)
        .map(date => new Date(date).getTime());
      return sum + Math.max(...dates);
    }, 0);
    
    return Math.round(totalDays / completedEmployees.length / (1000 * 60 * 60 * 24));
  };

  const calculateCertificationVelocity = (employees: any[], days: number) => {
    // Handle case when days is 0 (all time)
    if (days === 0) {
      const totalCompletions = employees.filter(e => 
        e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate
      ).length;
      return totalCompletions > 0 ? "1.00" : "0.00";
    }
    
    const recentCompletions = employees.filter(e => {
      const hasRecentCompletion = e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate;
      if (hasRecentCompletion) {
        const latestDate = [e.level1AwardedDate, e.level2AwardedDate, e.level3AwardedDate]
          .filter(date => date)
          .sort()
          .pop();
        return latestDate && (new Date().getTime() - new Date(latestDate).getTime()) <= (days * 24 * 60 * 60 * 1000);
      }
      return false;
    }).length;
    
    return (recentCompletions / days).toFixed(2);
  };

  const calculateRetentionRate = (employees: any[]) => {
    const advancedCertifications = employees.filter(e => e.level3Awarded || e.consultantAwarded || e.coachAwarded).length;
    const totalWithBasic = employees.filter(e => e.level1Awarded).length;
    return totalWithBasic > 0 ? ((advancedCertifications / totalWithBasic) * 100).toFixed(1) : 0;
  };

  const analyzeBottlenecks = (employees: any[]) => {
    const bottlenecks = [];
    const level1InProgress = employees.filter(e => e.level1ReliasAssigned && !e.level1Awarded).length;
    const level2InProgress = employees.filter(e => e.level2ReliasAssigned && !e.level2Awarded).length;
    const level3InProgress = employees.filter(e => e.level3ReliasAssigned && !e.level3Awarded).length;
    
    if (level1InProgress > employees.length * 0.3) bottlenecks.push('Level 1');
    if (level2InProgress > employees.length * 0.2) bottlenecks.push('Level 2');
    if (level3InProgress > employees.length * 0.1) bottlenecks.push('Level 3');
    
    return bottlenecks;
  };

  const calculateFacilityAvgTime = (facilityEmployees: any[]) => {
    const completed = facilityEmployees.filter(e => e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate);
    if (completed.length === 0) return 0;
    
    const totalTime = completed.reduce((sum, emp) => {
      const dates = [emp.level1AwardedDate, emp.level2AwardedDate, emp.level3AwardedDate]
        .filter(date => date)
        .map(date => new Date(date).getTime());
      return sum + Math.max(...dates);
    }, 0);
    
    return Math.round(totalTime / completed.length / (1000 * 60 * 60 * 24));
  };

  const calculateLevelAvgTime = (employees: any[], level: string) => {
    const levelEmployees = employees.filter(e => {
      switch(level) {
        case 'level1': return e.level1AwardedDate;
        case 'level2': return e.level2AwardedDate;
        case 'level3': return e.level3AwardedDate;
        case 'consultant': return e.consultantAwardedDate;
        case 'coach': return e.coachAwardedDate;
        default: return false;
      }
    });
    
    if (levelEmployees.length === 0) return 0;
    
    const totalTime = levelEmployees.reduce((sum, emp) => {
      const date = emp[`${level}AwardedDate`];
      return sum + new Date(date).getTime();
    }, 0);
    
    return Math.round(totalTime / levelEmployees.length / (1000 * 60 * 60 * 24));
  };

  const calculateTimeToComplete = (employee: any, achievement: string) => {
    let startDate, endDate;
    
    switch(achievement) {
      case 'Level 1':
        startDate = employee.level1ReliasAssignedDate;
        endDate = employee.level1AwardedDate;
        break;
      case 'Level 2':
        startDate = employee.level2ReliasAssignedDate;
        endDate = employee.level2AwardedDate;
        break;
      case 'Level 3':
        startDate = employee.level3ReliasAssignedDate;
        endDate = employee.level3AwardedDate;
        break;
      default:
        return 0;
    }
    
    if (!startDate || !endDate) return 0;
    return Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  const generateMonthlyTrends = (employees: any[], days: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Generate last 6 months of data
    return Array.from({ length: 6 }, (_, index) => {
      const monthOffset = 5 - index; // Start from 5 months ago
      const targetDate = new Date(currentYear, currentMonth - monthOffset, 1);
      const monthName = months[targetDate.getMonth()];
      
      // Count employees with certifications awarded in this month
      const monthEmployees = employees.filter(e => {
        const certificationDates = [
          e.level1AwardedDate,
          e.level2AwardedDate,
          e.level3AwardedDate,
          e.consultantAwardedDate,
          e.coachAwardedDate
        ].filter(date => date);
        
        return certificationDates.some(date => {
          const awardDate = new Date(date);
          return awardDate.getMonth() === targetDate.getMonth() && 
                 awardDate.getFullYear() === targetDate.getFullYear();
        });
      });
      
      // Count in-progress employees for this month
      const inProgressEmployees = employees.filter(e => {
        const hasInProgress = e.level1ReliasAssigned || e.level2ReliasAssigned || e.level3ReliasAssigned || 
                             e.consultantReliasAssigned || e.coachReliasAssigned;
        if (!hasInProgress) return false;
        
        // Check if they started in this month
        const startDates = [
          e.level1ReliasAssigned,
          e.level2ReliasAssigned,
          e.level3ReliasAssigned,
          e.consultantReliasAssigned,
          e.coachReliasAssigned
        ].filter(date => date);
        
        return startDates.some(date => {
          const startDate = new Date(date);
          return startDate.getMonth() === targetDate.getMonth() && 
                 startDate.getFullYear() === targetDate.getFullYear();
        });
      });
      
      return {
        month: monthName,
        completed: monthEmployees.length,
        inProgress: inProgressEmployees.length,
        new: Math.floor(monthEmployees.length * 0.3) // Estimate new enrollments
      };
    });
  };

  const generatePredictions = (employees: any[], days: number) => {
    const currentRate = parseFloat(calculateCertificationVelocity(employees, days));
    const totalEmployees = employees.length;
    const completed = employees.filter(e => 
      e.level1Awarded || e.level2Awarded || e.level3Awarded || e.consultantAwarded || e.coachAwarded
    ).length;
    
    const remaining = totalEmployees - completed;
    const predictedCompletions = Math.min(remaining, Math.round(currentRate * 30)); // Next 30 days
    
    return {
      nextMonth: predictedCompletions,
      completionRate: ((completed + predictedCompletions) / totalEmployees * 100).toFixed(1),
      targetAchievement: Math.round((completed + predictedCompletions) / totalEmployees * 100)
    };
  };

  // Calculate analytics data with dynamic filtering
  const analyticsData = useMemo(() => {
    let employees = state.employees;
    
    // Apply facility filter
    if (selectedFacility !== "all") {
      employees = employees.filter(e => e.facility === selectedFacility);
    }

    // Apply time range filter with enhanced options including custom date range
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // Calculate timeRangeDays for use throughout the function
    const timeRangeDays = {
      "3m": 90,
      "6m": 180,
      "1y": 365,
      "all": 0
    }[timeRange] || 365;
    
    if (timeRange === "custom" && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      if (timeRangeDays > 0) {
        startDate = new Date(now.getTime() - (timeRangeDays * 24 * 60 * 60 * 1000));
        endDate = now;
      }
    }
    
    // Filter employees based on time range and level
    let filteredEmployees = employees;
    
    if (startDate && endDate) {
      filteredEmployees = employees.filter(e => {
        // Check if employee has any certification activity within the date range
        const certificationDates = [
          e.level1AwardedDate,
          e.level2AwardedDate, 
          e.level3AwardedDate,
          e.consultantAwardedDate,
          e.coachAwardedDate
        ].filter(date => date);
        
        if (certificationDates.length === 0) return false;
        
        // Check if any certification was awarded within the date range
        return certificationDates.some(date => {
          const awardDate = new Date(date);
          return awardDate >= startDate! && awardDate <= endDate!;
        });
      });
    }
    
    // Apply level filter
    if (selectedLevel !== "all") {
      filteredEmployees = filteredEmployees.filter(e => {
        switch(selectedLevel) {
          case "level1": return e.level1Awarded;
          case "level2": return e.level2Awarded;
          case "level3": return e.level3Awarded;
          case "consultant": return e.consultantAwarded;
          case "coach": return e.coachAwarded;
          default: return true;
        }
      });
    }

    // Overall statistics
    const totalEmployees = filteredEmployees.length;
    const completedCertifications = filteredEmployees.filter(e => 
      e.level1Awarded || e.level2Awarded || e.level3Awarded || e.consultantAwarded || e.coachAwarded
    ).length;
    const inProgress = filteredEmployees.filter(e => 
      e.level1ReliasAssigned || e.level2ReliasAssigned || e.level3ReliasAssigned || 
      e.consultantReliasAssigned || e.coachReliasAssigned
    ).length;
    const notStarted = totalEmployees - completedCertifications - inProgress;

    // Level-wise breakdown
    const level1Completed = filteredEmployees.filter(e => e.level1Awarded).length;
    const level2Completed = filteredEmployees.filter(e => e.level2Awarded).length;
    const level3Completed = filteredEmployees.filter(e => e.level3Awarded).length;
    const consultantCompleted = filteredEmployees.filter(e => e.consultantAwarded).length;
    const coachCompleted = filteredEmployees.filter(e => e.coachAwarded).length;

    // Advanced metrics
    const averageCompletionTime = calculateAverageCompletionTime(filteredEmployees);
    const certificationVelocity = calculateCertificationVelocity(filteredEmployees, timeRangeDays);
    const retentionRate = calculateRetentionRate(filteredEmployees);
    const bottleneckAnalysis = analyzeBottlenecks(filteredEmployees);

    // Facility performance with advanced metrics
    const facilityStats = filteredEmployees.reduce((acc, emp) => {
      if (!acc[emp.facility]) {
        acc[emp.facility] = { 
          total: 0, 
          completed: 0, 
          inProgress: 0, 
          avgTime: 0,
          efficiency: 0
        };
      }
      acc[emp.facility].total++;
      if (emp.level1Awarded || emp.level2Awarded || emp.level3Awarded || emp.consultantAwarded || emp.coachAwarded) {
        acc[emp.facility].completed++;
      } else if (emp.level1ReliasAssigned || emp.level2ReliasAssigned || emp.level3ReliasAssigned || emp.consultantReliasAssigned || emp.coachReliasAssigned) {
        acc[emp.facility].inProgress++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number; avgTime: number; efficiency: number }>);

    // Calculate facility efficiency
    Object.keys(facilityStats).forEach(facility => {
      const stats = facilityStats[facility];
      stats.efficiency = (stats.completed / stats.total) * 100;
      stats.avgTime = calculateFacilityAvgTime(filteredEmployees.filter(e => e.facility === facility));
    });

    // Area performance with trends
    const areaStats = filteredEmployees.reduce((acc, emp) => {
      if (!acc[emp.area]) {
        acc[emp.area] = { 
          total: 0, 
          completed: 0, 
          inProgress: 0,
          growth: 0,
          potential: 0
        };
      }
      acc[emp.area].total++;
      if (emp.level1Awarded || emp.level2Awarded || emp.level3Awarded || emp.consultantAwarded || emp.coachAwarded) {
        acc[emp.area].completed++;
      } else if (emp.level1ReliasAssigned || emp.level2ReliasAssigned || emp.level3ReliasAssigned || emp.consultantReliasAssigned || emp.coachReliasAssigned) {
        acc[emp.area].inProgress++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number; growth: number; potential: number }>);

    // Calculate area growth potential
    Object.keys(areaStats).forEach(area => {
      const stats = areaStats[area];
      stats.growth = ((stats.completed + stats.inProgress) / stats.total) * 100;
      stats.potential = (stats.inProgress / stats.total) * 100;
    });

    // Dynamic monthly trends based on actual data
    const monthlyTrends = generateMonthlyTrends(filteredEmployees, timeRangeDays);
    
    // Certification progress with targets and efficiency
    const certificationProgress = [
      { 
        level: "Level 1", 
        completed: level1Completed, 
        inProgress: filteredEmployees.filter(e => e.level1ReliasAssigned && !e.level1Awarded).length, 
        target: totalEmployees * 0.8,
        efficiency: (level1Completed / totalEmployees) * 100,
        avgTime: calculateLevelAvgTime(filteredEmployees, 'level1')
      },
      { 
        level: "Level 2", 
        completed: level2Completed, 
        inProgress: filteredEmployees.filter(e => e.level2ReliasAssigned && !e.level2Awarded).length, 
        target: totalEmployees * 0.6,
        efficiency: (level2Completed / totalEmployees) * 100,
        avgTime: calculateLevelAvgTime(filteredEmployees, 'level2')
      },
      { 
        level: "Level 3", 
        completed: level3Completed, 
        inProgress: filteredEmployees.filter(e => e.level3ReliasAssigned && !e.level3Awarded).length, 
        target: totalEmployees * 0.4,
        efficiency: (level3Completed / totalEmployees) * 100,
        avgTime: calculateLevelAvgTime(filteredEmployees, 'level3')
      },
      { 
        level: "Consultant", 
        completed: consultantCompleted, 
        inProgress: filteredEmployees.filter(e => e.consultantReliasAssigned && !e.consultantAwarded).length, 
        target: totalEmployees * 0.2,
        efficiency: (consultantCompleted / totalEmployees) * 100,
        avgTime: calculateLevelAvgTime(filteredEmployees, 'consultant')
      },
      { 
        level: "Coach", 
        completed: coachCompleted, 
        inProgress: filteredEmployees.filter(e => e.coachReliasAssigned && !e.coachAwarded).length, 
        target: totalEmployees * 0.1,
        efficiency: (coachCompleted / totalEmployees) * 100,
        avgTime: calculateLevelAvgTime(filteredEmployees, 'coach')
      },
    ];

         // Top performing facilities with efficiency metrics (always use all data, not filtered)
     const allFacilityStats = state.employees.reduce((acc, emp) => {
       if (!acc[emp.facility]) {
         acc[emp.facility] = { 
           total: 0, 
           completed: 0, 
           inProgress: 0, 
           avgTime: 0,
           efficiency: 0
         };
       }
       acc[emp.facility].total++;
       if (emp.level1Awarded || emp.level2Awarded || emp.level3Awarded || emp.consultantAwarded || emp.coachAwarded) {
         acc[emp.facility].completed++;
       } else if (emp.level1ReliasAssigned || emp.level2ReliasAssigned || emp.level3ReliasAssigned || emp.consultantReliasAssigned || emp.coachReliasAssigned) {
         acc[emp.facility].inProgress++;
       }
       return acc;
     }, {} as Record<string, { total: number; completed: number; inProgress: number; avgTime: number; efficiency: number }>);

     // Calculate facility efficiency for all facilities
     Object.keys(allFacilityStats).forEach(facility => {
       const stats = allFacilityStats[facility];
       stats.efficiency = (stats.completed / stats.total) * 100;
       stats.avgTime = calculateFacilityAvgTime(state.employees.filter(e => e.facility === facility));
     });

     const topFacilities = Object.entries(allFacilityStats)
       .map(([facility, stats]) => ({
         facility,
         completionRate: (stats.completed / stats.total) * 100,
         efficiency: stats.efficiency,
         avgTime: stats.avgTime,
         total: stats.total,
         completed: stats.completed
       }))
       .sort((a, b) => b.efficiency - a.efficiency)
       .slice(0, 5);

    // Recent activity with performance indicators
    const recentActivity = filteredEmployees
      .filter(e => e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate)
      .map(e => {
        const latestAward = [e.level1AwardedDate, e.level2AwardedDate, e.level3AwardedDate]
          .filter(date => date)
          .sort()
          .pop();
        const achievement = e.level3Awarded ? "Level 3" : e.level2Awarded ? "Level 2" : "Level 1";
        const timeToComplete = calculateTimeToComplete(e, achievement);
        
        return {
          employee: e.name,
          facility: e.facility,
          achievement,
          date: latestAward,
          timeToComplete,
          performance: timeToComplete < 120 ? 'Excellent' : timeToComplete < 180 ? 'Good' : 'Average'
        };
      })
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
      .slice(0, 10);

    // Predictive analytics
    const predictions = generatePredictions(filteredEmployees, timeRangeDays);

    return {
      totalEmployees,
      completedCertifications,
      inProgress,
      notStarted,
      level1Completed,
      level2Completed,
      level3Completed,
      consultantCompleted,
      coachCompleted,
      facilityStats,
      areaStats,
      monthlyTrends,
      certificationProgress,
      topFacilities,
      recentActivity,
      averageCompletionTime,
      certificationVelocity,
      retentionRate,
      bottleneckAnalysis,
      predictions
    };
  }, [state.employees, timeRange, selectedFacility, selectedLevel, customStartDate, customEndDate]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  function csvEscape(value: unknown): string {
    const str = value === undefined || value === null ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
    // Reset custom dates when switching away from custom range
    if (newTimeRange !== "custom") {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  const handleExport = () => {
    const lines: string[] = [];

    // Filter Information
    lines.push("Filter Settings");
    lines.push(["Filter","Value"].map(csvEscape).join(","));
    
    let timeRangeText = "";
    if (timeRange === "custom" && customStartDate && customEndDate) {
      timeRangeText = `Custom: ${customStartDate.toLocaleDateString()} to ${customEndDate.toLocaleDateString()}`;
    } else {
      timeRangeText = timeRange === "3m" ? "3 Months" : timeRange === "6m" ? "6 Months" : timeRange === "1y" ? "1 Year" : "All Time";
    }
    
    lines.push(["Time Range", timeRangeText].map(csvEscape).join(","));
    lines.push(["Level Filter", selectedLevel === "all" ? "All Levels" : selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)].map(csvEscape).join(","));
    lines.push(["Facility Filter", selectedFacility === "all" ? "All Facilities" : selectedFacility].map(csvEscape).join(","));
    lines.push("");

    // Overview
    lines.push("Overview Metrics");
    lines.push(["Metric","Value"].map(csvEscape).join(","));
    lines.push(["Total Employees", analyticsData.totalEmployees].map(csvEscape).join(","));
    lines.push(["Completed Certifications", analyticsData.completedCertifications].map(csvEscape).join(","));
    lines.push(["In Progress", analyticsData.inProgress].map(csvEscape).join(","));
    lines.push(["Not Started", analyticsData.notStarted].map(csvEscape).join(","));
    lines.push(["Avg Completion Time (days)", analyticsData.averageCompletionTime].map(csvEscape).join(","));
    lines.push(["Certification Velocity (per day)", analyticsData.certificationVelocity].map(csvEscape).join(","));
    lines.push(["Retention Rate (%)", analyticsData.retentionRate].map(csvEscape).join(","));
    lines.push("");

    // Level completions
    lines.push("Level Completions");
    lines.push(["Level","Completed"].map(csvEscape).join(","));
    lines.push(["Level 1", analyticsData.level1Completed].map(csvEscape).join(","));
    lines.push(["Level 2", analyticsData.level2Completed].map(csvEscape).join(","));
    lines.push(["Level 3", analyticsData.level3Completed].map(csvEscape).join(","));
    lines.push(["Consultant", analyticsData.consultantCompleted].map(csvEscape).join(","));
    lines.push(["Coach", analyticsData.coachCompleted].map(csvEscape).join(","));
    lines.push("");

    // Top facilities (overall, already unfiltered)
    lines.push("Top Facilities");
    lines.push(["Facility","Completion Rate (%)","Completed","Total","Avg Time (days)"].map(csvEscape).join(","));
    analyticsData.topFacilities.forEach(f => {
      lines.push([
        f.facility,
        f.completionRate.toFixed(1),
        f.completed,
        f.total,
        f.avgTime
      ].map(csvEscape).join(","));
    });
    lines.push("");

    // Recent achievements
    lines.push("Recent Achievements");
    lines.push(["Employee","Facility","Achievement","Date","Time To Complete (days)","Performance"].map(csvEscape).join(","));
    analyticsData.recentActivity.forEach(a => {
      lines.push([
        a.employee,
        a.facility,
        a.achievement,
        a.date ? new Date(a.date).toLocaleDateString() : "",
        a.timeToComplete,
        a.performance
      ].map(csvEscape).join(","));
    });

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, "0");
    const d = String(ts.getDate()).padStart(2, "0");
    a.download = `analytics-report-${y}${m}${d}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1>Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into training progress and performance metrics
        </p>
      </header>

      {/* Enhanced Filters with Magic UI */}
      <div className="space-y-6">
        <BentoGrid className="grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
          <BentoCard
            name="Time Range"
            description="Filter by certification award period"
            className="col-span-1"
            background={
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50" />
            }
            Icon={Calendar}
            href="#"
            cta="Select Period"
          />
          <BentoCard
            name="Certification Level"
            description="Filter by specific certification levels"
            className="col-span-1"
            background={
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50" />
            }
            Icon={Award}
            href="#"
            cta="Select Level"
          />
          <BentoCard
            name="Facility"
            description="Filter by specific facilities"
            className="col-span-1"
            background={
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50" />
            }
            Icon={Building}
            href="#"
            cta="Select Facility"
          />
          <BentoCard
            name="Export Data"
            description="Download filtered analytics report"
            className="col-span-1"
            background={
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/50" />
            }
            Icon={Download}
            href="#"
            cta="Export Report"
          />
        </BentoGrid>

        {/* Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="time-range" className="text-xs font-medium text-gray-700 dark:text-gray-300">Time Range</Label>
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger id="time-range" className="w-[140px] bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Last 3 months</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Date Range Picker */}
            {timeRange === "custom" && (
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">From</Label>
                  <DatePicker
                    date={customStartDate}
                    onDateChange={setCustomStartDate}
                    placeholder="Start date"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">To</Label>
                  <DatePicker
                    date={customEndDate}
                    onDateChange={setCustomEndDate}
                    placeholder="End date"
                  />
                </div>
                {timeRange === "custom" && (!customStartDate || !customEndDate) && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-6">
                    Please select both start and end dates
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="level-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger id="level-filter" className="w-[140px] bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="level1">Level 1</SelectItem>
                  <SelectItem value="level2">Level 2</SelectItem>
                  <SelectItem value="level3">Level 3</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="facility-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">Facility</Label>
              <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                <SelectTrigger id="facility-filter" className="w-[180px] bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {Object.keys(state.employees.reduce((acc, emp) => {
                    acc[emp.facility] = true;
                    return acc;
                  }, {} as Record<string, boolean>)).map(facility => (
                    <SelectItem key={facility} value={facility}>{facility}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2 bg-white dark:bg-gray-800" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filter Summary */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Active Filters:</span>
              </div>
                             <div className="flex gap-2">
                 <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                   {timeRange === "custom" && customStartDate && customEndDate 
                     ? `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`
                     : timeRange === "3m" ? "3 Months" : timeRange === "6m" ? "6 Months" : timeRange === "1y" ? "1 Year" : "All Time"
                   }
                 </Badge>
                {selectedLevel !== "all" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}
                  </Badge>
                )}
                {selectedFacility !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {selectedFacility}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{analyticsData.totalEmployees}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Filtered Results</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{analyticsData.completedCertifications}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Completed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{analyticsData.inProgress}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">In Progress</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {analyticsData.totalEmployees > 0 ? Math.round((analyticsData.completedCertifications / analyticsData.totalEmployees) * 100) : 0}%
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Completion Rate</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {timeRange === "custom" && customStartDate && customEndDate 
                    ? Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24))
                    : timeRange === "3m" ? 90 : timeRange === "6m" ? 180 : timeRange === "1y" ? 365 : 0
                  }
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Days in Range</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certification Velocity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.certificationVelocity}</div>
            <p className="text-xs text-muted-foreground">
              completions per day
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageCompletionTime}</div>
            <p className="text-xs text-muted-foreground">
              days to complete
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              advanced certifications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bottlenecks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.bottleneckAnalysis.length}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.bottleneckAnalysis.length > 0 ? analyticsData.bottleneckAnalysis.join(', ') : 'No bottlenecks'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Certification Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Certification Progress</CardTitle>
                <CardDescription>Current status across all levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.certificationProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#0088FE" name="Completed" />
                    <Bar dataKey="inProgress" fill="#FFBB28" name="In Progress" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Level Distribution</CardTitle>
                <CardDescription>Breakdown by certification level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                                         <Pie
                       data={[
                         { name: "Level 1", value: analyticsData.level1Completed },
                         { name: "Level 2", value: analyticsData.level2Completed },
                         { name: "Level 3", value: analyticsData.level3Completed },
                         { name: "Consultant", value: analyticsData.consultantCompleted },
                         { name: "Coach", value: analyticsData.coachCompleted },
                       ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Facilities */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Facilities</CardTitle>
              <CardDescription>Facilities with highest completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topFacilities.map((facility, index) => (
                  <div key={facility.facility} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{facility.facility}</p>
                        <p className="text-sm text-muted-foreground">
                          {facility.completed} of {facility.total} employees certified
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{facility.completionRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Completion Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time-based Certification Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Certification Trends</CardTitle>
                <CardDescription>Certifications awarded over selected time period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#0088FE" strokeWidth={2} name="Completed" />
                    <Line type="monotone" dataKey="inProgress" stroke="#FFBB28" strokeWidth={2} name="In Progress" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Level-specific Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Level Performance</CardTitle>
                <CardDescription>Completion rates by certification level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.certificationProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#00C49F" name="Completion Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Time Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Certification Time Distribution</CardTitle>
              <CardDescription>How certifications are distributed across the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#0088FE" fill="#0088FE" name="Completed" />
                  <Area type="monotone" dataKey="inProgress" stackId="1" stroke="#FFBB28" fill="#FFBB28" name="In Progress" />
                  <Area type="monotone" dataKey="new" stackId="1" stroke="#00C49F" fill="#00C49F" name="New" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Facility Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Facility Performance</CardTitle>
                <CardDescription>Completion rates by facility</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(analyticsData.facilityStats).map(([facility, stats]) => ({
                    facility,
                    completionRate: (stats.completed / stats.total) * 100,
                    inProgressRate: (stats.inProgress / stats.total) * 100,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="facility" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#0088FE" name="Completion Rate" />
                    <Bar dataKey="inProgressRate" fill="#FFBB28" name="In Progress" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Area Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Area Performance</CardTitle>
                <CardDescription>Completion rates by area</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(analyticsData.areaStats).map(([area, stats]) => ({
                    area,
                    completionRate: (stats.completed / stats.total) * 100,
                    inProgressRate: (stats.inProgress / stats.total) * 100,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#00C49F" name="Completion Rate" />
                    <Bar dataKey="inProgressRate" fill="#FF8042" name="In Progress" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Latest certification completions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{activity.achievement}</Badge>
                        <div>
                          <p className="font-medium">{activity.employee}</p>
                          <p className="text-sm text-muted-foreground">{activity.facility}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {activity.date ? new Date(activity.date).toLocaleDateString() : 'N/A'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              activity.performance === 'Excellent' ? 'text-green-600 border-green-200' :
                              activity.performance === 'Good' ? 'text-blue-600 border-blue-200' :
                              'text-orange-600 border-orange-200'
                            }`}
                          >
                            {activity.performance}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {activity.timeToComplete} days
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Predictive Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Predictive Analytics</CardTitle>
                <CardDescription>Forecasted performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Next Month Predictions</span>
                    <Badge variant="outline">
                      {analyticsData.predictions.nextMonth} completions
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Projected Completion Rate</span>
                    <Badge variant="outline">{analyticsData.predictions.completionRate}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Target Achievement</span>
                    <Badge variant="outline">{analyticsData.predictions.targetAchievement}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Velocity Trend</span>
                    <Badge variant="outline" className="text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {parseFloat(analyticsData.certificationVelocity) > 0.5 ? 'High' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Efficiency Score</span>
                    <Badge variant="outline">
                      {analyticsData.averageCompletionTime < 90 ? 'Excellent' : analyticsData.averageCompletionTime < 150 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
