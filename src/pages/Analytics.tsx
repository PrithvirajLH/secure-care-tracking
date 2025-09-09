import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
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
  Area
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
import { useAnalytics, AnalyticsFilters } from "@/hooks/useAnalytics";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<string>("1y");
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  // Build analytics filters
  const analyticsFilters = useMemo((): AnalyticsFilters => {
    const filters: AnalyticsFilters = {
      facility: selectedFacility !== "all" ? selectedFacility : undefined,
      level: selectedLevel !== "all" ? selectedLevel : undefined
    };

    // Add date range filters
    if (timeRange === "custom" && customStartDate && customEndDate) {
      filters.startDate = customStartDate.toISOString().split('T')[0];
      filters.endDate = customEndDate.toISOString().split('T')[0];
    } else if (timeRange !== "all") {
      const now = new Date();
      const days = timeRange === "3m" ? 90 : timeRange === "6m" ? 180 : 365;
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      filters.startDate = startDate.toISOString().split('T')[0];
      filters.endDate = now.toISOString().split('T')[0];
    }

    return filters;
  }, [timeRange, selectedFacility, selectedLevel, customStartDate, customEndDate]);

  // Use the new analytics hook
  const { data: analyticsData, isLoading, error } = useAnalytics(analyticsFilters);

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
    if (isLoading || !analyticsData) {
      toast.error("Please wait for data to load before exporting");
      return;
    }

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
    lines.push(["Total Employees", analyticsData.overview.totalEmployees].map(csvEscape).join(","));
    lines.push(["Completed Certifications", analyticsData.overview.completedCertifications].map(csvEscape).join(","));
    lines.push(["In Progress", analyticsData.overview.inProgress].map(csvEscape).join(","));
    lines.push(["Not Started", analyticsData.overview.notStarted].map(csvEscape).join(","));
    lines.push(["Avg Completion Time (days)", Math.round(analyticsData.overview.averageCompletionTime || 0)].map(csvEscape).join(","));
    
    // Add real-time metrics
    lines.push(["Active Training Sessions", analyticsData.metrics.activeTrainingSessions].map(csvEscape).join(","));
    lines.push(["Overdue Training", analyticsData.metrics.overdueTraining].map(csvEscape).join(","));
    lines.push(["Recent Completions (7 days)", analyticsData.metrics.recentCompletions].map(csvEscape).join(","));
    lines.push(["Training Efficiency (%)", analyticsData.metrics.trainingEfficiency].map(csvEscape).join(","));
    
    lines.push("");

    // Level completions
    lines.push("Level Completions");
    lines.push(["Level","Completed"].map(csvEscape).join(","));
    lines.push(["Level 1", analyticsData.overview.level1Completed].map(csvEscape).join(","));
    lines.push(["Level 2", analyticsData.overview.level2Completed].map(csvEscape).join(","));
    lines.push(["Level 3", analyticsData.overview.level3Completed].map(csvEscape).join(","));
    lines.push(["Consultant", analyticsData.overview.consultantCompleted].map(csvEscape).join(","));
    lines.push(["Coach", analyticsData.overview.coachCompleted].map(csvEscape).join(","));
    lines.push("");

    // Top facilities
    lines.push("Top Facilities");
    lines.push(["Facility","Completion Rate (%)","Completed","Total","Avg Time (days)"].map(csvEscape).join(","));
    analyticsData.facilityPerformance.slice(0, 5).forEach(f => {
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
    
    toast.success("Analytics report exported successfully!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics Dashboard"
        description="Comprehensive insights into training progress and performance metrics"
      />

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
                  {analyticsData?.facilityPerformance.map(facility => (
                    <SelectItem key={facility.facility} value={facility.facility}>{facility.facility}</SelectItem>
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

      {/* Loading State */}
      {isLoading && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-600">Loading analytics data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-red-600">Error loading analytics data: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{analyticsData?.overview.totalEmployees || 0}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Filtered Results</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{analyticsData?.overview.completedCertifications || 0}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Completed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{analyticsData?.overview.inProgress || 0}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">In Progress</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {analyticsData?.overview.totalEmployees ? Math.round((analyticsData.overview.completedCertifications / analyticsData.overview.totalEmployees) * 100) : 0}%
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



      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>

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
                  <BarChart data={analyticsData?.certificationProgress || []}>
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
                        { name: "Level 1", value: analyticsData?.overview.level1Completed || 0 },
                        { name: "Level 2", value: analyticsData?.overview.level2Completed || 0 },
                        { name: "Level 3", value: analyticsData?.overview.level3Completed || 0 },
                        { name: "Consultant", value: analyticsData?.overview.consultantCompleted || 0 },
                        { name: "Coach", value: analyticsData?.overview.coachCompleted || 0 },
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
                {analyticsData?.facilityPerformance.slice(0, 5).map((facility, index) => (
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
                  <LineChart data={analyticsData?.monthlyTrends || []}>
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
                  <BarChart data={analyticsData?.certificationProgress || []}>
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
                <AreaChart data={analyticsData?.monthlyTrends || []}>
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
                  <BarChart data={analyticsData?.facilityPerformance.map(facility => ({
                    facility: facility.facility,
                    completionRate: facility.completionRate,
                    inProgressRate: (facility.inProgress / facility.total) * 100,
                  })) || []}>
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
                  <BarChart data={analyticsData?.areaPerformance.map(area => ({
                    area: area.area,
                    completionRate: area.completionRate,
                    inProgressRate: (area.inProgress / area.total) * 100,
                  })) || []}>
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


      </Tabs>
    </div>
  );
}
