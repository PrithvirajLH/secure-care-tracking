import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ShineBorder } from "@/components/magicui/shine-border";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Award, 
  TrendingUp, 
  Search,
  Plus,
  Edit,
  MessageSquare,
  Calendar,
  Target,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { trainingAPI } from "@/services/api";

interface Advisor {
  id: string; // advisorId as string
  name: string; // fullName
  email: string;
  specializations: string[];
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  successRate: number;
  status: "active" | "inactive";
}

interface AdvisorAssignment {
  employeeId: string;
  employeeName: string;
  level: string;
  assignedDate: Date;
  status: "in_progress" | "completed" | "overdue";
  notes: string;
  facility: string;
  area: string;
}

export default function AdvisorManagement() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("all");
  const [apiAdvisors, setApiAdvisors] = useState<any[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState<boolean>(false);
  const [isAddAdvisorOpen, setIsAddAdvisorOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [notesEmployeeId, setNotesEmployeeId] = useState<string>("");
  const [notesLevel, setNotesLevel] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editAdvisorOldName, setEditAdvisorOldName] = useState("");
  const [editAdvisorNewName, setEditAdvisorNewName] = useState("");

  // Use the same data source as other components for consistency
  const { employees: currentEmployees, isLoading, error } = useEmployees({}, 50); // Get all 50 employees

  // Use currentEmployees if available, otherwise fall back to state.employees
  const employees = currentEmployees && currentEmployees.length > 0 ? currentEmployees : state.employees;

  // Load advisors from the backend to ensure we show all advisors
  useEffect(() => {
    const load = async () => {
      setLoadingAdvisors(true);
      try {
        const list = await trainingAPI.getAdvisors();
        setApiAdvisors(list);
      } catch (e) {
        console.error('Failed to load advisors', e);
        toast.error('Failed to load advisors');
      } finally {
        setLoadingAdvisors(false);
      }
    };
    load();
  }, []);

  // Merge advisors from API with employee stats
  const advisors = useMemo(() => {
    const result: Advisor[] = apiAdvisors.map((a: any) => ({
      id: String(a.advisorId),
      name: a.fullName || `${a.firstName} ${a.lastName || ''}`.trim(),
      email: `${(a.fullName || `${a.firstName} ${a.lastName || ''}`).toLowerCase().replace(/\s+/g, '.')}@securecare.com`,
      specializations: [],
      totalAssignments: 0,
      activeAssignments: 0,
      completedAssignments: 0,
      successRate: 0,
      status: 'active'
    }));

    const idToAdvisor = new Map(result.map(r => [r.id, r] as const));

    employees.forEach((employee: any) => {
      const id = employee.advisorId != null ? String(employee.advisorId) : undefined;
      if (!id) return;
      const adv = idToAdvisor.get(id);
      if (!adv) return; // advisor exists even if not present in assignments
      adv.totalAssignments++;
      if (employee.assignedDate) {
        if (employee.secureCareAwarded) adv.completedAssignments++; else adv.activeAssignments++;
      }
      const spec = employee.awardType || 'Level 1';
      if (!adv.specializations.includes(spec)) adv.specializations.push(spec);
    });

    result.forEach(adv => {
      adv.successRate = adv.totalAssignments > 0 ? Math.round((adv.completedAssignments / adv.totalAssignments) * 100) : 0;
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [apiAdvisors, employees]);

  // Get advisor assignments
  const getAdvisorAssignments = (advisorId: string): AdvisorAssignment[] => {
    const assignments: AdvisorAssignment[] = [];
    
    employees.forEach(employee => {
      if (String((employee as any).advisorId ?? '') === advisorId) {
        const assignedDate = (employee as any).assignedDate ? new Date((employee as any).assignedDate) : new Date();
        const daysSinceAssigned = Math.floor((Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
        assignments.push({
          employeeId: (employee as any).employeeId,
          employeeName: (employee as any).name || (employee as any).Employee,
          level: (employee as any).awardType || 'Level 1',
          assignedDate,
          status: (employee as any).secureCareAwarded ? 'completed' : (daysSinceAssigned > 60 ? 'overdue' : 'in_progress'),
          notes: (employee as any).notes || '',
          facility: (employee as any).facility || (employee as any).Facility,
          area: (employee as any).area || (employee as any).Area
        });
      }
    });

    return assignments.sort((a, b) => b.assignedDate.getTime() - a.assignedDate.getTime());
  };

  // Filter advisors based on search
  const filteredAdvisors = advisors.filter(advisor =>
    advisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    advisor.specializations.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const totalAdvisors = advisors.length;
    const activeAdvisors = advisors.filter(a => a.status === 'active').length;
    const totalAssignments = advisors.reduce((sum, a) => sum + a.activeAssignments, 0);
    const avgSuccessRate = advisors.length > 0 
      ? Math.round(advisors.reduce((sum, a) => sum + a.successRate, 0) / advisors.length)
      : 0;

    return { totalAdvisors, activeAdvisors, totalAssignments, avgSuccessRate };
  }, [advisors]);

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: "default", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      in_progress: { variant: "secondary", className: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
      overdue: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle }
    };
    
    const config = variants[status as keyof typeof variants];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const openNotes = (assignment: AdvisorAssignment) => {
    setNotesEmployeeId(assignment.employeeId);
    setNotesLevel(assignment.level);
    setNotesText(assignment.notes || "");
    setIsNotesOpen(true);
  };

  const saveNotes = () => {
    const keyMap: Record<string, keyof typeof employees[number]> = {
      "Level 1": "level1Notes",
      "Level 2": "level2Notes",
      "Level 3": "level3Notes",
      "Consultant": "consultantNotes",
      "Coach": "coachNotes",
    };

    const updated = employees.map(emp => {
      if (emp.employeeId !== notesEmployeeId) return emp;
      const key = keyMap[notesLevel];
      return { ...emp, [key]: notesText } as typeof emp;
    });
    dispatch({ type: "setEmployees", payload: updated });
    setIsNotesOpen(false);
  };

  const openEditAdvisor = (name: string) => {
    setEditAdvisorOldName(name);
    setEditAdvisorNewName(name);
    setIsEditOpen(true);
  };

  const saveEditAdvisor = () => {
    const updated = employees.map(emp => {
      const replace = (value: string) => (value === editAdvisorOldName ? editAdvisorNewName : value);
      return {
        ...emp,
        level1Advisor: replace(emp.level1Advisor),
        level2Advisor: replace(emp.level2Advisor),
        level3Advisor: replace(emp.level3Advisor),
        consultantAdvisor: replace(emp.consultantAdvisor),
        coachAdvisor: replace(emp.coachAdvisor),
      };
    });
    dispatch({ type: "setEmployees", payload: updated });
    setIsEditOpen(false);
  };

  return (
    <>


      {/* Action Buttons */}
      <div className="flex gap-2">
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Target className="w-4 h-4 mr-2" />
              Assign Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Employee to Advisor</DialogTitle>
              <DialogDescription>
                Select an employee and advisor to create a new assignment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee">Employee</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.name} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="advisor">Advisor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select advisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {advisors.map(advisor => (
                      <SelectItem key={advisor.id} value={advisor.name}>
                        {advisor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Certification Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Level 1">Level 1</SelectItem>
                    <SelectItem value="Level 2">Level 2</SelectItem>
                    <SelectItem value="Level 3">Level 3</SelectItem>
                    <SelectItem value="Consultant">Consultant</SelectItem>
                    <SelectItem value="Coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAssignModalOpen(false)}>
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isAddAdvisorOpen} onOpenChange={setIsAddAdvisorOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Advisor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Advisor</DialogTitle>
              <DialogDescription>Create a new advisor profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter advisor name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="advisor@securecare.com" />
              </div>
              <div>
                <Label htmlFor="specializations">Specializations</Label>
                <Input id="specializations" placeholder="Level 1, Level 2, etc." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddAdvisorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddAdvisorOpen(false)}>
                  Add Advisor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advisors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalAdvisors}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats.activeAdvisors} active advisors
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Success Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.avgSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">Completion rate across all advisors</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Good</div>
            <p className="text-xs text-muted-foreground">Overall advisor performance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search advisors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advisors Table */}
          <Card>
            <CardHeader>
              <CardTitle>Advisor Directory</CardTitle>
              <CardDescription>Complete list of all advisors and their current workload</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvisors.map((advisor) => (
                    <TableRow key={advisor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {advisor.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{advisor.name}</div>
                            <div className="text-sm text-muted-foreground">{advisor.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {advisor.specializations.map(spec => (
                            <Badge key={spec} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{advisor.activeAssignments}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{advisor.completedAssignments}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{advisor.successRate}%</div>
                          {advisor.successRate >= 80 && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {advisor.successRate < 60 && <AlertCircle className="w-4 h-4 text-red-600" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={advisor.status === 'active' ? 'default' : 'secondary'}>
                          {advisor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditAdvisor(advisor.name)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setIsNotesOpen(true)}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="advisor-filter">Filter by Advisor</Label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Advisors</SelectItem>
                  {advisors.map(advisor => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>All active and recent advisor assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisors
                    .filter(advisor => selectedAdvisor === "all" || advisor.id === selectedAdvisor)
                    .flatMap(advisor => getAdvisorAssignments(advisor.id))
                    .slice(0, 20)
                    .map((assignment, index) => (
                    <TableRow key={`${assignment.employeeId}-${assignment.level}-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.employeeName}</div>
                          <div className="text-sm text-muted-foreground">{assignment.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.level}</Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const employee = employees.find(e => e.employeeId === assignment.employeeId);
                          if (!employee) return 'Unassigned';
                          
                          let advisor: string | undefined;
                          switch (assignment.level) {
                            case 'Level 1':
                              advisor = employee.level1Advisor;
                              break;
                            case 'Level 2':
                              advisor = employee.level2Advisor;
                              break;
                            case 'Level 3':
                              advisor = employee.level3Advisor;
                              break;
                            case 'Consultant':
                              advisor = employee.consultantAdvisor;
                              break;
                            case 'Coach':
                              advisor = employee.coachAdvisor;
                              break;
                            default:
                              advisor = undefined;
                          }
                          
                          return advisor && advisor.trim() !== '' ? advisor : 'Unassigned';
                        })()}
                      </TableCell>
                      <TableCell>
                        {assignment.assignedDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openNotes(assignment)}>
                          View / Edit
                        </Button>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(assignment.status)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.facility}</div>
                          <div className="text-sm text-muted-foreground">{assignment.area}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Advisors</CardTitle>
                <CardDescription>Based on completion rates and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advisors
                    .sort((a, b) => b.successRate - a.successRate)
                    .slice(0, 5)
                    .map((advisor, index) => (
                    <div key={advisor.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{advisor.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {advisor.completedAssignments} completions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{advisor.successRate}%</div>
                        <div className="text-sm text-muted-foreground">success rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
                <CardDescription>Current assignment distribution across advisors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advisors
                    .sort((a, b) => b.activeAssignments - a.activeAssignments)
                    .slice(0, 5)
                    .map((advisor) => (
                    <div key={advisor.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{advisor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {advisor.activeAssignments} active
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((advisor.activeAssignments / Math.max(...advisors.map(a => a.activeAssignments))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Notes Modal */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-600" />
              Edit Notes
            </DialogTitle>
            <DialogDescription>
              Add or update notes for this assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="relative">
              <ShineBorder
                borderWidth={1}
                duration={20}
                shineColor={["#06b6d4", "#0891b2", "#0e7490"]}
                className="rounded-lg"
              />
              <div className="p-4 bg-white rounded-lg">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignment-notes" className="text-sm font-medium">
                      Assignment Notes
                    </Label>
                    <Textarea
                      id="assignment-notes"
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Add notes about this assignment..."
                      className="min-h-[120px] resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {notesText.length} characters
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsNotesOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveNotes} className="bg-cyan-600 hover:bg-cyan-700">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Advisor Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              Edit Advisor
            </DialogTitle>
            <DialogDescription>Rename advisor across assignments</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="relative">
              <ShineBorder
                borderWidth={1}
                duration={20}
                shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                className="rounded-lg"
              />
              <div className="p-4 bg-white rounded-lg">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="advisor-name" className="text-sm font-medium">
                      Advisor Name
                    </Label>
                    <Input
                      id="advisor-name"
                      value={editAdvisorNewName}
                      onChange={(e) => setEditAdvisorNewName(e.target.value)}
                      placeholder="Enter advisor name..."
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveEditAdvisor} className="bg-purple-600 hover:bg-purple-700">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
