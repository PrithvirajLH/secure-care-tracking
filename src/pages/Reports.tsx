import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  Download, 
  Save, 
  Plus, 
  Filter, 
  BarChart3, 
  PieChart as PieChartIcon,
  Table as TableIcon,
  FileText,
  Users,
  Award,
  Building,
  Calendar,
  Settings,
  Eye,
  Edit,
  Trash2,
  Share2,
  Printer,
  Mail
} from "lucide-react";
import { format } from "date-fns";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'table' | 'chart' | 'summary';
  filters: ReportFilter[];
  columns: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  createdAt: Date;
  lastUsed?: Date;
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  value2?: any;
}

export default function Reports() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportType, setReportType] = useState<'table' | 'chart' | 'summary'>('table');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: undefined,
    end: undefined
  });

  // Available columns for reports
  const availableColumns = [
    { key: 'employeeId', label: 'Employee ID', type: 'text' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'facility', label: 'Facility', type: 'text' },
    { key: 'area', label: 'Area', type: 'text' },
    { key: 'level1Awarded', label: 'Level 1 Awarded', type: 'boolean' },
    { key: 'level1AwardedDate', label: 'Level 1 Date', type: 'date' },
    { key: 'level2Awarded', label: 'Level 2 Awarded', type: 'boolean' },
    { key: 'level2AwardedDate', label: 'Level 2 Date', type: 'date' },
    { key: 'level3Awarded', label: 'Level 3 Awarded', type: 'boolean' },
    { key: 'level3AwardedDate', label: 'Level 3 Date', type: 'date' },
    { key: 'consultantAwarded', label: 'Consultant Awarded', type: 'boolean' },
    { key: 'consultantAwardedDate', label: 'Consultant Date', type: 'date' },
    { key: 'coachAwarded', label: 'Coach Awarded', type: 'boolean' },
    { key: 'coachAwardedDate', label: 'Coach Date', type: 'date' },
    { key: 'level1ReliasAssigned', label: 'Level 1 Assigned', type: 'date' },
    { key: 'level2ReliasAssigned', label: 'Level 2 Assigned', type: 'date' },
    { key: 'level3ReliasAssigned', label: 'Level 3 Assigned', type: 'date' },
    { key: 'consultantReliasAssigned', label: 'Consultant Assigned', type: 'date' },
    { key: 'coachReliasAssigned', label: 'Coach Assigned', type: 'date' }
  ];

  // Sample saved report templates
  const [savedTemplates] = useState<ReportTemplate[]>([
    {
      id: '1',
      name: 'Certification Status Report',
      description: 'Overview of all employee certification levels',
      type: 'table',
      filters: [],
      columns: ['employeeId', 'name', 'facility', 'level1Awarded', 'level2Awarded', 'level3Awarded'],
      createdAt: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20')
    },
    {
      id: '2',
      name: 'Overdue Training Analysis',
      description: 'Employees with overdue training assignments',
      type: 'chart',
      chartType: 'bar',
      filters: [],
      columns: ['facility', 'level1Awarded', 'level2Awarded'],
      createdAt: new Date('2024-01-10'),
      lastUsed: new Date('2024-01-18')
    },
    {
      id: '3',
      name: 'Facility Performance Summary',
      description: 'Training completion rates by facility',
      type: 'summary',
      filters: [],
      columns: ['facility', 'level1Awarded', 'level2Awarded', 'level3Awarded'],
      createdAt: new Date('2024-01-05')
    }
  ]);

  // Filter and process data based on current report configuration
  const filteredData = useMemo(() => {
    let data = [...state.employees];

    // Apply filters
    filters.forEach(filter => {
      data = data.filter(employee => {
        const value = employee[filter.field as keyof typeof employee];
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater_than':
            return value > filter.value;
          case 'less_than':
            return value < filter.value;
          case 'between':
            return value >= filter.value && value <= filter.value2;
          case 'in':
            return Array.isArray(filter.value) ? filter.value.includes(value) : false;
          default:
            return true;
        }
      });
    });

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      data = data.filter(employee => {
        const dates = [
          employee.level1AwardedDate,
          employee.level2AwardedDate,
          employee.level3AwardedDate,
          employee.consultantAwardedDate,
          employee.coachAwardedDate
        ].filter(date => date);

        if (dates.length === 0) return false;

        const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
        
        if (dateRange.start && latestDate < dateRange.start) return false;
        if (dateRange.end && latestDate > dateRange.end) return false;
        
        return true;
      });
    }

    return data;
  }, [state.employees, filters, dateRange]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (reportType !== 'chart') return [];

    if (selectedColumns.includes('facility')) {
      return Object.entries(
        filteredData.reduce((acc, emp) => {
          acc[emp.facility] = (acc[emp.facility] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([facility, count]) => ({ name: facility, value: count }));
    }

    if (selectedColumns.includes('level1Awarded')) {
      const awarded = filteredData.filter(emp => emp.level1Awarded).length;
      const notAwarded = filteredData.length - awarded;
      return [
        { name: 'Awarded', value: awarded },
        { name: 'Not Awarded', value: notAwarded }
      ];
    }

    return [];
  }, [filteredData, reportType, selectedColumns]);

  // Add new filter
  const addFilter = () => {
    setFilters([...filters, {
      field: 'name',
      operator: 'contains',
      value: ''
    }]);
  };

  // Update filter
  const updateFilter = (index: number, field: keyof ReportFilter, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Toggle column selection
  const toggleColumn = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(c => c !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Export report
  const exportReport = (format: 'csv' | 'pdf' | 'excel') => {
    const data = filteredData.map(emp => {
      const row: any = {};
      selectedColumns.forEach(col => {
        const column = availableColumns.find(c => c.key === col);
        if (column) {
          row[column.label] = emp[col as keyof typeof emp];
        }
      });
      return row;
    });

    if (format === 'csv') {
      const headers = selectedColumns.map(col => 
        availableColumns.find(c => c.key === col)?.label || col
      );
      const csvContent = [
        headers.join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName || 'report'}.csv`;
      a.click();
    }
  };

  // Save report template
  const saveTemplate = () => {
    const template: ReportTemplate = {
      id: Date.now().toString(),
      name: reportName,
      description: reportDescription,
      type: reportType,
      chartType: reportType === 'chart' ? chartType : undefined,
      filters,
      columns: selectedColumns,
      createdAt: new Date()
    };
    
    // In a real app, this would save to backend
    console.log('Saving template:', template);
    alert('Template saved successfully!');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Reports</h1>
          <p className="text-gray-600 mt-2">Create, save, and export custom reports for your HR needs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab("templates")}>
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" onClick={() => setActiveTab("builder")}>
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Saved Templates</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge variant={template.type === 'table' ? 'default' : template.type === 'chart' ? 'secondary' : 'outline'}>
                      {template.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>Created: {format(template.createdAt, 'MMM dd, yyyy')}</span>
                    {template.lastUsed && (
                      <span>Last used: {format(template.lastUsed, 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setSelectedTemplate(template)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Report Configuration */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="reportName">Report Name</Label>
                    <Input
                      id="reportName"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Enter report name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reportDescription">Description</Label>
                    <Textarea
                      id="reportDescription"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Describe your report"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Report Type</Label>
                    <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Data Table</SelectItem>
                        <SelectItem value="chart">Chart</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {reportType === 'chart' && (
                    <div>
                      <Label>Chart Type</Label>
                      <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="area">Area Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Date Range Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>Date Range</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Start Date</Label>
                    <DatePicker
                      date={dateRange.start}
                      onDateChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <DatePicker
                      date={dateRange.end}
                      onDateChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Columns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {availableColumns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={selectedColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <Label htmlFor={column.key} className="text-sm">
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Filters</CardTitle>
                    <Button size="sm" onClick={addFilter}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filters.map((filter, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Filter {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFilter(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(index, 'field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((col) => (
                            <SelectItem key={col.key} value={col.key}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(value: any) => updateFilter(index, 'operator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                        placeholder="Value"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={saveTemplate}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => exportReport('csv')}>
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => exportReport('pdf')}>
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Preview */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Report Preview</CardTitle>
                    <Badge variant="secondary">
                      {filteredData.length} records
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportType === 'table' && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {selectedColumns.map((col) => (
                              <TableHead key={col}>
                                {availableColumns.find(c => c.key === col)?.label || col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.slice(0, 10).map((employee, index) => (
                            <TableRow key={index}>
                              {selectedColumns.map((col) => (
                                <TableCell key={col}>
                                  {employee[col as keyof typeof employee]?.toString() || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {filteredData.length > 10 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Showing first 10 of {filteredData.length} records
                        </p>
                      )}
                    </div>
                  )}

                  {reportType === 'chart' && (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' && (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        )}
                        {chartType === 'line' && (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" />
                          </LineChart>
                        )}
                        {chartType === 'pie' && (
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        )}
                        {chartType === 'area' && (
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}

                  {reportType === 'summary' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {filteredData.length}
                          </div>
                          <div className="text-sm text-gray-600">Total Employees</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-green-600">
                            {filteredData.filter(emp => emp.level1Awarded).length}
                          </div>
                          <div className="text-sm text-gray-600">Level 1 Certified</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-purple-600">
                            {filteredData.filter(emp => emp.level2Awarded).length}
                          </div>
                          <div className="text-sm text-gray-600">Level 2 Certified</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-orange-600">
                            {filteredData.filter(emp => emp.level3Awarded).length}
                          </div>
                          <div className="text-sm text-gray-600">Level 3 Certified</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-indigo-600">
                            {filteredData.filter(emp => emp.consultantAwarded).length}
                          </div>
                          <div className="text-sm text-gray-600">Consultants</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-red-600">
                            {filteredData.filter(emp => emp.coachAwarded).length}
                          </div>
                          <div className="text-sm text-gray-600">Coaches</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
