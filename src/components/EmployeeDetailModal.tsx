import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle,
  FileText,
  Video,
  Award,
  User,
  Building,
  MapPin,
  GraduationCap,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { Employee } from "@/context/AppContext";
import { format } from "date-fns";

interface EmployeeDetailModalProps {
  employee: Employee;
  children: React.ReactNode;
}

export default function EmployeeDetailModal({ employee, children }: EmployeeDetailModalProps) {
  const [open, setOpen] = useState(false);

  const getLevelProgress = (level: string) => {
    switch (level) {
      case "care-partner":
        return {
          requirements: [
            { name: "Relias Training Assigned", completed: !!employee.level1ReliasAssigned, date: employee.level1ReliasAssigned },
            { name: "Relias Training Completed", completed: !!employee.level1ReliasCompleted, date: employee.level1ReliasCompleted },
            { name: "Conference Completed", completed: !!employee.level1ConferenceCompleted, date: employee.level1ConferenceCompleted },
            { name: "Level 1 Awarded", completed: employee.level1Awarded, date: employee.level1AwardedDate }
          ],
          total: 4,
          completed: [!!employee.level1ReliasAssigned, !!employee.level1ReliasCompleted, !!employee.level1ConferenceCompleted, employee.level1Awarded].filter(Boolean).length,
          color: "text-blue-600",
          icon: Users
        };
      case "associate":
        return {
          requirements: [
            { name: "Relias Training Assigned", completed: !!employee.level2ReliasAssigned, date: employee.level2ReliasAssigned },
            { name: "Relias Training Completed", completed: !!employee.level2ReliasCompleted, date: employee.level2ReliasCompleted },
            { name: "Conference Completed", completed: !!employee.level2ConferenceCompleted, date: employee.level2ConferenceCompleted },
            { name: "Standing Video", completed: !!employee.level2StandingVideo, date: employee.level2StandingVideo },
            { name: "Sleeping/Sitting Video", completed: !!employee.level2SleepingSittingVideo, date: employee.level2SleepingSittingVideo },
            { name: "Feeding Video", completed: !!employee.level2FeedingVideo, date: employee.level2FeedingVideo },
            { name: "Level 2 Awarded", completed: employee.level2Awarded, date: employee.level2AwardedDate }
          ],
          total: 7,
          completed: [!!employee.level2ReliasAssigned, !!employee.level2ReliasCompleted, !!employee.level2ConferenceCompleted, 
                     !!employee.level2StandingVideo, !!employee.level2SleepingSittingVideo, !!employee.level2FeedingVideo, employee.level2Awarded].filter(Boolean).length,
          color: "text-green-600",
          icon: Award
        };
      case "champion":
        return {
          requirements: [
            { name: "Relias Training Assigned", completed: !!employee.level3ReliasAssigned, date: employee.level3ReliasAssigned },
            { name: "Relias Training Completed", completed: !!employee.level3ReliasCompleted, date: employee.level3ReliasCompleted },
            { name: "Conference Completed", completed: !!employee.level3ConferenceCompleted, date: employee.level3ConferenceCompleted },
            { name: "Sitting/Standing/Approaching", completed: !!employee.level3SittingStandingApproaching, date: employee.level3SittingStandingApproaching },
            { name: "No Hand/No Speak", completed: !!employee.level3NoHandNoSpeak, date: employee.level3NoHandNoSpeak },
            { name: "Challenge Sleeping", completed: !!employee.level3ChallengeSleeping, date: employee.level3ChallengeSleeping },
            { name: "Level 3 Awarded", completed: employee.level3Awarded, date: employee.level3AwardedDate }
          ],
          total: 7,
          completed: [!!employee.level3ReliasAssigned, !!employee.level3ReliasCompleted, !!employee.level3ConferenceCompleted,
                     !!employee.level3SittingStandingApproaching, !!employee.level3NoHandNoSpeak, !!employee.level3ChallengeSleeping, employee.level3Awarded].filter(Boolean).length,
          color: "text-purple-600",
          icon: Star
        };
      case "consultant":
        return {
          requirements: [
            { name: "Relias Training Assigned", completed: !!employee.consultantReliasAssigned, date: employee.consultantReliasAssigned },
            { name: "Relias Training Completed", completed: !!employee.consultantReliasCompleted, date: employee.consultantReliasCompleted },
            { name: "Conference Completed", completed: !!employee.consultantConferenceCompleted, date: employee.consultantConferenceCompleted },
            { name: "Coaching Session 1", completed: !!employee.consultantCoachingSession1, date: employee.consultantCoachingSession1 },
            { name: "Coaching Session 2", completed: !!employee.consultantCoachingSession2, date: employee.consultantCoachingSession2 },
            { name: "Coaching Session 3", completed: !!employee.consultantCoachingSession3, date: employee.consultantCoachingSession3 },
            { name: "Consultant Awarded", completed: employee.consultantAwarded, date: employee.consultantAwardedDate }
          ],
          total: 7,
          completed: [!!employee.consultantReliasAssigned, !!employee.consultantReliasCompleted, !!employee.consultantConferenceCompleted,
                     !!employee.consultantCoachingSession1, !!employee.consultantCoachingSession2, !!employee.consultantCoachingSession3, employee.consultantAwarded].filter(Boolean).length,
          color: "text-orange-600",
          icon: GraduationCap
        };
      case "coach":
        return {
          requirements: [
            { name: "Relias Training Assigned", completed: !!employee.coachReliasAssigned, date: employee.coachReliasAssigned },
            { name: "Relias Training Completed", completed: !!employee.coachReliasCompleted, date: employee.coachReliasCompleted },
            { name: "Conference Completed", completed: !!employee.coachConferenceCompleted, date: employee.coachConferenceCompleted },
            { name: "Coaching Session 1", completed: !!employee.coachCoachingSession1, date: employee.coachCoachingSession1 },
            { name: "Coaching Session 2", completed: !!employee.coachCoachingSession2, date: employee.coachCoachingSession2 },
            { name: "Coaching Session 3", completed: !!employee.coachCoachingSession3, date: employee.coachCoachingSession3 },
            { name: "Coach Awarded", completed: employee.coachAwarded, date: employee.coachAwardedDate }
          ],
          total: 7,
          completed: [!!employee.coachReliasAssigned, !!employee.coachReliasCompleted, !!employee.coachConferenceCompleted,
                     !!employee.coachCoachingSession1, !!employee.coachCoachingSession2, !!employee.coachCoachingSession3, employee.coachAwarded].filter(Boolean).length,
          color: "text-teal-600",
          icon: TrendingUp
        };
      default:
        return { requirements: [], total: 0, completed: 0, color: "", icon: Users };
    }
  };

  const levels = [
    { key: "care-partner", name: "Level 1", progress: getLevelProgress("care-partner") },
    { key: "associate", name: "Level 2", progress: getLevelProgress("associate") },
    { key: "champion", name: "Level 3", progress: getLevelProgress("champion") },
    { key: "consultant", name: "Consultant", progress: getLevelProgress("consultant") },
    { key: "coach", name: "Coach", progress: getLevelProgress("coach") }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="w-6 h-6" />
            Employee Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{employee.name}</span>
                <Badge variant="outline">{employee.staffRoles}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.facility}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.area}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.employeeId}</span>
              </div>
            </CardContent>
          </Card>

          {/* Training Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="care-partner" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  {levels.map((level) => (
                    <TabsTrigger key={level.key} value={level.key} className="flex items-center gap-2">
                      <level.progress.icon className="w-4 h-4" />
                      {level.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {levels.map((level) => (
                  <TabsContent key={level.key} value={level.key} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <level.progress.icon className={`w-6 h-6 ${level.progress.color}`} />
                        <div>
                          <h3 className="font-semibold">{level.name} Level</h3>
                          <p className="text-sm text-muted-foreground">
                            {level.progress.completed} of {level.progress.total} requirements completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(level.progress.completed / level.progress.total) * 100} className="w-24" />
                        <span className="text-sm font-medium">
                          {Math.round((level.progress.completed / level.progress.total) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {level.progress.requirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {req.completed ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground" />
                            )}
                            <span className="font-medium">{req.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.date && (
                              <span className="text-sm text-muted-foreground">
                                {format(req.date, "MMM dd, yyyy")}
                              </span>
                            )}
                            <Badge variant={req.completed ? "default" : "secondary"}>
                              {req.completed ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button>
              <PlayCircle className="w-4 h-4 mr-2" />
              Assign Training
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
