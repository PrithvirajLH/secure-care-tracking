import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useEmployees, useAdvisors } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarClock, Users, UserCheck, Award, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { MagicCard } from "@/components/magicui/magic-card";
import { trainingAPI } from "@/services/api";
import { toast } from "sonner";

interface Advisor {
  id: string;
  name: string;
  assignments: {
    [level: string]: {
      employees: Array<{
        employeeId: string;
        employeeName: string;
        facility: string;
        area: string;
        status: 'completed' | 'in_progress' | 'overdue';
        assignedDate: string;
      }>;
      count: number;
    };
  };
  totalAssignments: number;
  completedAssignments: number;
  successRate: number;
}

export default function Advisors() {
  const { state } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newAdvisor, setNewAdvisor] = useState({ firstName: '', lastName: '' });
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Use React Query for both employees and advisors data
  const { employees: currentEmployees, isLoading: employeesLoading, error: employeesError } = useEmployees({}, 50);
  const { data: apiAdvisors = [], isLoading: advisorsLoading, error: advisorsError, refetch: refetchAdvisors } = useAdvisors();
  const employees = currentEmployees && currentEmployees.length > 0 ? currentEmployees : state.employees;

  // Handle adding new advisor
  const handleAddAdvisor = async () => {
    if (!newAdvisor.firstName.trim() || !newAdvisor.lastName.trim()) {
      toast.error('Please enter both first name and last name');
      return;
    }

    setIsAdding(true);
    try {
      const advisor = await trainingAPI.addAdvisor(newAdvisor.firstName.trim(), newAdvisor.lastName.trim());
      setNewAdvisor({ firstName: '', lastName: '' });
      setIsAddModalOpen(false);
      toast.success(`Advisor ${advisor.fullName} added successfully`);
      // Refetch advisors data to include the new advisor
      refetchAdvisors();
    } catch (error) {
      console.error('Failed to add advisor:', error);
      toast.error('Failed to add advisor');
    } finally {
      setIsAdding(false);
    }
  };

  // Process advisors with their assignments grouped by level using actual database data
  const advisors = useMemo(() => {
    // Create advisor objects from API data
    const result: Advisor[] = apiAdvisors.map((a: any) => ({
      id: String(a.advisorId),
      name: a.fullName || `${a.firstName} ${a.lastName || ''}`.trim(),
      assignments: {
        'Level 1': { employees: [], count: 0 },
        'Level 2': { employees: [], count: 0 },
        'Level 3': { employees: [], count: 0 },
        'Consultant': { employees: [], count: 0 },
        'Coach': { employees: [], count: 0 }
      },
      totalAssignments: 0,
      completedAssignments: 0,
      successRate: 0
    }));

    // Create a map for quick advisor lookup
    const idToAdvisor = new Map(result.map(r => [r.id, r] as const));

    // Process employees and assign them to advisors based on actual database relationships
    employees.forEach((employee: any) => {
      // Use the actual advisorId from the database
      const advisorId = employee.advisorId != null ? String(employee.advisorId) : null;
      if (!advisorId) return;
      
      const advisor = idToAdvisor.get(advisorId);
      if (!advisor) return;

      // Use the actual awardType from the database
      const level = employee.awardType;
      if (!level || !advisor.assignments[level]) return;

      // Calculate status based on actual database fields
      const assignedDate = employee.assignedDate ? new Date(employee.assignedDate) : new Date();
      const daysSinceAssigned = Math.floor((Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const employeeData = {
        employeeId: employee.employeeId,
        employeeName: employee.name || employee.Employee,
        facility: employee.facility || employee.Facility,
        area: employee.area || employee.Area,
        status: employee.secureCareAwarded ? 'completed' as const : (daysSinceAssigned > 60 ? 'overdue' as const : 'in_progress' as const),
        assignedDate: assignedDate.toLocaleDateString()
      };
      
      // Add employee to the appropriate level assignment
      advisor.assignments[level].employees.push(employeeData);
      advisor.assignments[level].count++;
      advisor.totalAssignments++;
      
      // Count completed assignments based on actual database field
      if (employee.secureCareAwarded) {
        advisor.completedAssignments++;
      }
    });

    // Calculate success rate based on actual data
    result.forEach(advisor => {
      advisor.successRate = advisor.totalAssignments > 0 ? Math.round((advisor.completedAssignments / advisor.totalAssignments) * 100) : 0;
    });


    // Sort by name - show all advisors, even those without assignments
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [apiAdvisors, employees]);

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
      in_progress: { variant: "secondary", className: "bg-blue-100 text-blue-800 border-blue-200" },
      overdue: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" }
    };
    
    const config = variants[status as keyof typeof variants];
    
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getLevelColor = (level: string) => {
    const colors = {
      'Level 1': 'bg-blue-100 text-blue-800 border-blue-200',
      'Level 2': 'bg-green-100 text-green-800 border-green-200',
      'Level 3': 'bg-purple-100 text-purple-800 border-purple-200',
      'Consultant': 'bg-orange-100 text-orange-800 border-orange-200',
      'Coach': 'bg-teal-100 text-teal-800 border-teal-200'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (employeesLoading || advisorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advisors...</p>
        </div>
      </div>
    );
  }

  if (employeesError || advisorsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Failed to load advisors</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Advisor Management"
        description="View advisors and their assigned employees by training level"
      >
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <ShimmerButton
              shimmerColor="#8b5cf6"
              shimmerSize="0.05em"
              shimmerDuration="3s"
              borderRadius="8px"
              background="linear-gradient(45deg, #8b5cf6, #a855f7, #c084fc)"
              className="text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Advisor
            </ShimmerButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] p-0 border-0 bg-transparent">
            <MagicCard
              className="p-6"
              gradientSize={200}
              gradientColor="#8b5cf6"
              gradientOpacity={0.1}
              gradientFrom="#8b5cf6"
              gradientTo="#a855f7"
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-semibold text-gray-900">Add New Advisor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right text-gray-700">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={newAdvisor.firstName}
                    onChange={(e) => setNewAdvisor(prev => ({ ...prev, firstName: e.target.value }))}
                    className="col-span-3"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right text-gray-700">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={newAdvisor.lastName}
                    onChange={(e) => setNewAdvisor(prev => ({ ...prev, lastName: e.target.value }))}
                    className="col-span-3"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setNewAdvisor({ firstName: '', lastName: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAdvisor}
                  disabled={isAdding || !newAdvisor.firstName.trim() || !newAdvisor.lastName.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isAdding ? 'Adding...' : 'Add Advisor'}
                </Button>
              </div>
            </MagicCard>
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors shadow-lg hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advisors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{advisors.length}</div>
            <p className="text-xs text-muted-foreground">Active advisors</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors shadow-lg hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {advisors.reduce((sum, a) => sum + a.totalAssignments, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors shadow-lg hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {advisors.reduce((sum, a) => sum + a.completedAssignments, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Completed assignments</p>
          </CardContent>
        </Card>
      </div>

      {/* Advisors Table */}
      <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors shadow-lg hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Advisors and Their Assignments</CardTitle>
          </CardHeader>
          <CardContent>
          {advisors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No advisors found</p>
              <p className="text-sm">No advisors are currently in the system.</p>
            </div>
          ) : (
            <Table className="text-base">
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="w-32 text-lg font-semibold text-gray-700">Advisor</TableHead>
                  <TableHead className="w-20 text-lg font-semibold text-gray-700">Level 1</TableHead>
                  <TableHead className="w-20 text-lg font-semibold text-gray-700">Level 2</TableHead>
                  <TableHead className="w-20 text-lg font-semibold text-gray-700">Level 3</TableHead>
                  <TableHead className="w-20 text-lg font-semibold text-gray-700">Consultant</TableHead>
                  <TableHead className="w-20 text-lg font-semibold text-gray-700">Coach</TableHead>
                  <TableHead className="w-16 text-lg font-semibold text-gray-700">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advisors.map((advisor) => (
                  <TableRow key={advisor.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                            {advisor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-lg text-gray-900">{advisor.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Level columns */}
                    {['Level 1', 'Level 2', 'Level 3', 'Consultant', 'Coach'].map((level) => (
                      <TableCell key={level} className="py-4">
                        <div className="space-y-1">
                          {advisor.assignments[level].employees.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {advisor.assignments[level].employees.map(emp => (
                                <Badge key={emp.employeeId} variant="outline" className={`${getLevelColor(level)} text-sm font-medium`}>
                                  {emp.employeeName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No assignments</div>
                          )}
                        </div>
                      </TableCell>
                    ))}
                    
                    <TableCell className="py-4">
                      <div className="font-semibold text-xl text-gray-900">{advisor.totalAssignments}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </CardContent>
        </Card>
    </div>
  );
}
