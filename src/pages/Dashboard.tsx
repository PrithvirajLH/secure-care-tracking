import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, FileText, Plus, UsersRound } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";

const COLORS = ["hsl(var(--primary))", "hsl(var(--brand-teal))", "hsl(var(--accent))", "hsl(var(--success))"];

export default function Dashboard() {
  const { state } = useApp();

  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  const stats = useMemo(() => {
    const total = state.employees.length;
    const carePartner = Math.round((state.employees.filter(e => !!e.level1ReliasCompleted).length / Math.max(total,1)) * 100);
    const associate = Math.round((state.employees.filter(e => e.secureCareAssociateAwarded).length / Math.max(total,1)) * 100);
    const champion = Math.round((state.employees.filter(e => e.secureCareChampionAwarded).length / Math.max(total,1)) * 100);
    const consultant = Math.round((state.employees.filter(e => e.secureCareConsultantAwarded).length / Math.max(total,1)) * 100);
    const coach = Math.round((state.employees.filter(e => e.secureCareCoachAwarded).length / Math.max(total,1)) * 100);

    return {
      total,
      pending: state.employees.filter(e => !e.level2ReliasCompleted).length,
      overdue: state.employees.filter(e => e.level2ReliasAssigned && !e.level2ReliasCompleted).length,
      completion: { carePartner, associate, champion, consultant, coach },
    };
  }, [state.employees]);

  const donutData = [
    { name: "Care Partner", value: stats.completion.carePartner },
    { name: "Associate", value: stats.completion.associate },
    { name: "Champion", value: stats.completion.champion },
    { name: "Consultant", value: stats.completion.consultant },
  ];

  const facilityData = [
    { name: "Evergreen", completed: 68 },
    { name: "Lakeside", completed: 82 },
    { name: "Hilltop", completed: 51 },
  ];

  return (
    <div className="space-y-6">
      <header className="sr-only">
        <h1>SecureCare Training Dashboard</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Total Employees</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold flex items-center gap-2">
              <UsersRound className="text-primary" /> {stats.total}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Pending Assignments</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-warning">
              {stats.pending}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Overdue Training</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-destructive">
              {stats.overdue}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Certifications Awarded</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold flex items-center gap-2">
              <Award className="text-accent" /> {state.employees.filter(e => e.secureCareAssociateAwarded || e.secureCarePartnerAwarded).length}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Certification Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={donutData} innerRadius={60} outerRadius={90} paddingAngle={4}>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Facility Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="hsl(var(--brand-teal))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center justify-between rounded-md border p-3">
                <span>Maria Chen completed Associate Relias</span>
                <span className="text-xs text-muted-foreground">2 days ago</span>
              </li>
              <li className="flex items-center justify-between rounded-md border p-3">
                <span>Alex Johnson assigned Level 2 videos</span>
                <span className="text-xs text-muted-foreground">4 days ago</span>
              </li>
              <li className="flex items-center justify-between rounded-md border p-3">
                <span>New training uploaded by HR</span>
                <span className="text-xs text-muted-foreground">1 week ago</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="hero" className="hover-scale"><Plus className="mr-2" /> Assign Training</Button>
            <Button variant="secondary" className="hover-scale"><FileText className="mr-2" /> Run Report</Button>
            <Button variant="outline" className="hover-scale"><Award className="mr-2" /> Manage Certifications</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
