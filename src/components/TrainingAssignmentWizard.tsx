import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  PlayCircle,
  Users,
  Calendar as CalendarIcon,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Award,
  Star,
  GraduationCap,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { Employee } from "@/context/AppContext";

interface TrainingAssignmentWizardProps {
  employees: Employee[];
  onAssign: (assignments: any[]) => void;
  children: React.ReactNode;
}

const trainingLevels = [
  { key: "care-partner", name: "Care Partner", icon: Users, color: "text-blue-600" },
  { key: "associate", name: "Associate", icon: Award, color: "text-green-600" },
  { key: "champion", name: "Champion", icon: Star, color: "text-purple-600" },
  { key: "consultant", name: "Consultant", icon: GraduationCap, color: "text-orange-600" },
  { key: "coach", name: "Coach", icon: TrendingUp, color: "text-teal-600" }
];

export default function TrainingAssignmentWizard({ employees, onAssign, children }: TrainingAssignmentWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [assignmentDate, setAssignmentDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("");

  const advisors = [
    "Dr. Smith",
    "Dr. Lee", 
    "Dr. Johnson",
    "Dr. Brown",
    "Dr. Wilson",
    "Dr. Davis",
    "Dr. Martinez",
    "Dr. Thompson",
    "Dr. Anderson"
  ];

  const getEligibleEmployees = (level: string) => {
    switch (level) {
      case "care-partner":
        return employees.filter(e => !e.level1ReliasAssigned);
      case "associate":
        return employees.filter(e => e.secureCarePartnerAwarded && !e.level2ReliasAssigned);
      case "champion":
        return employees.filter(e => e.secureCareAssociateAwarded && !e.level3ReliasAssigned);
      case "consultant":
        return employees.filter(e => e.secureCareChampionAwarded && !e.consultantReliasAssigned);
      case "coach":
        return employees.filter(e => e.secureCareConsultantAwarded && !e.coachReliasAssigned);
      default:
        return [];
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    const eligible = getEligibleEmployees(selectedLevel);
    if (selectedEmployees.length === eligible.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(eligible.map(e => e.employeeId));
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedLevel) {
      setStep(2);
    } else if (step === 2 && selectedEmployees.length > 0) {
      setStep(3);
    } else if (step === 3 && assignmentDate && dueDate) {
      handleAssign();
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleAssign = () => {
    const assignments = selectedEmployees.map(employeeId => ({
      employeeId,
      level: selectedLevel,
      assignmentDate,
      dueDate,
      advisor: selectedAdvisor
    }));
    
    onAssign(assignments);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedEmployees([]);
    setSelectedLevel("");
    setAssignmentDate(undefined);
    setDueDate(undefined);
    setSelectedAdvisor("");
  };

  const eligibleEmployees = getEligibleEmployees(selectedLevel);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <PlayCircle className="w-6 h-6" />
            Assign Training
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= stepNumber ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > stepNumber ? <CheckCircle className="w-4 h-4" /> : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    step > stepNumber ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select Training Level */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Training Level</h3>
              <div className="grid gap-4">
                {trainingLevels.map((level) => {
                  const eligible = getEligibleEmployees(level.key);
                  return (
                    <Card 
                      key={level.key} 
                      className={`cursor-pointer transition-colors ${
                        selectedLevel === level.key ? "ring-2 ring-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedLevel(level.key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <level.icon className={`w-6 h-6 ${level.color}`} />
                            <div>
                              <h4 className="font-medium">{level.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {eligible.length} employees eligible
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{eligible.length}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Select Employees */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Select Employees</h3>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedEmployees.length === eligibleEmployees.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {eligibleEmployees.map((employee) => (
                  <div key={employee.employeeId} className="flex items-center space-x-3 p-3 rounded-lg border">
                    <Checkbox
                      id={employee.employeeId}
                      checked={selectedEmployees.includes(employee.employeeId)}
                      onCheckedChange={() => handleEmployeeToggle(employee.employeeId)}
                    />
                    <Label htmlFor={employee.employeeId} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {employee.employeeId} • {employee.facility} • {employee.area}
                          </div>
                        </div>
                        <Badge variant="outline">{employee.staffRoles}</Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Set Details */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assignment Details</h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Assignment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {assignmentDate ? format(assignmentDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={assignmentDate}
                        onSelect={setAssignmentDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Advisor</Label>
                  <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an advisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {advisors.map((advisor) => (
                        <SelectItem key={advisor} value={advisor}>
                          {advisor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Training Level:</span>
                    <span className="font-medium">
                      {trainingLevels.find(l => l.key === selectedLevel)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Employees:</span>
                    <span className="font-medium">{selectedEmployees.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assignment Date:</span>
                    <span className="font-medium">
                      {assignmentDate ? format(assignmentDate, "MMM dd, yyyy") : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span className="font-medium">
                      {dueDate ? format(dueDate, "MMM dd, yyyy") : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Advisor:</span>
                    <span className="font-medium">{selectedAdvisor || "Not assigned"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <Button 
              onClick={handleNext}
              disabled={
                (step === 1 && !selectedLevel) ||
                (step === 2 && selectedEmployees.length === 0) ||
                (step === 3 && (!assignmentDate || !dueDate))
              }
            >
              {step === 3 ? (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Assign Training
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
