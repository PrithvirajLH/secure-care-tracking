import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Save,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

// Comprehensive Settings Page for SecureCare Training Dashboard
// Features: User Preferences, Notifications, Training Configuration, System Settings, Data Management
// Last updated: December 2024
export default function Settings() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    overdue: true,
    completions: true,
    assignments: false
  });

  const [trainingSettings, setTrainingSettings] = useState({
    level1Duration: 30,
    level2Duration: 45,
    level3Duration: 60,
    consultantDuration: 90,
    coachDuration: 120,
    autoAssign: true,
    requireApproval: true
  });

  const [systemSettings, setSystemSettings] = useState({
    theme: "light",
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h"
  });

  const [dataSettings, setDataSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    retentionDays: 365,
    exportFormat: "csv"
  });

  const [displayName, setDisplayName] = useState("Admin User");
  const [email, setEmail] = useState("admin@securecare.com");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = (section: string) => {
    // Save settings to localStorage (in a real app, this would save to backend)
    try {
      const settingsData = {
        notifications,
        trainingSettings,
        systemSettings,
        dataSettings,
        displayName,
        email
      };
      
      localStorage.setItem('securecare-settings', JSON.stringify(settingsData));
      
      toast.success(`${section} settings saved successfully!`, {
        description: "Your preferences have been updated and will be applied immediately."
      });
    } catch (error) {
      toast.error("Failed to save settings", {
        description: "Please try again or contact support if the issue persists."
      });
    }
  };

  const handleExport = () => {
    try {
      const settingsData = {
        notifications,
        trainingSettings,
        systemSettings,
        dataSettings,
        displayName,
        email,
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(settingsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `securecare-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Settings exported successfully!", {
        description: "Your configuration has been saved to a JSON file."
      });
    } catch (error) {
      toast.error("Failed to export settings", {
        description: "Please try again or contact support if the issue persists."
      });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target?.result as string);
            
            // Validate and apply imported settings
            if (importedData.notifications) setNotifications(importedData.notifications);
            if (importedData.trainingSettings) setTrainingSettings(importedData.trainingSettings);
            if (importedData.systemSettings) setSystemSettings(importedData.systemSettings);
            if (importedData.dataSettings) setDataSettings(importedData.dataSettings);
            if (importedData.displayName) setDisplayName(importedData.displayName);
            if (importedData.email) setEmail(importedData.email);
            
            // Save to localStorage
            localStorage.setItem('securecare-settings', JSON.stringify(importedData));
            
            toast.success("Settings imported successfully!", {
              description: "Your configuration has been restored from the backup file."
            });
          } catch (error) {
            toast.error("Invalid settings file", {
              description: "Please ensure you're importing a valid SecureCare settings file."
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    // Reset to default settings
    setNotifications({
      email: true,
      push: false,
      sms: false,
      overdue: true,
      completions: true,
      assignments: false
    });
    
    setTrainingSettings({
      level1Duration: 30,
      level2Duration: 45,
      level3Duration: 60,
      consultantDuration: 90,
      coachDuration: 120,
      autoAssign: true,
      requireApproval: true
    });
    
    setSystemSettings({
      theme: "light",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h"
    });
    
    setDataSettings({
      autoBackup: true,
      backupFrequency: "daily",
      retentionDays: 365,
      exportFormat: "csv"
    });
    
    setDisplayName("Admin User");
    setEmail("admin@securecare.com");
    
    // Clear localStorage
    localStorage.removeItem('securecare-settings');
    
    toast.success("Settings reset to defaults", {
      description: "All settings have been restored to their default values."
    });
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all training data? This action cannot be undone.")) {
      try {
        // Clear all data from localStorage (in a real app, this would clear from backend)
        localStorage.clear();
        
        toast.success("All data cleared successfully", {
          description: "The system has been reset to its initial state."
        });
      } catch (error) {
        toast.error("Failed to clear data", {
          description: "Please try again or contact support if the issue persists."
        });
      }
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setSystemSettings({ ...systemSettings, theme: newTheme });
    
    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast.success("Theme updated", {
      description: `Switched to ${newTheme} theme.`
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setSystemSettings({ ...systemSettings, language: newLanguage });
    
    // In a real app, this would change the app's language
    toast.success("Language updated", {
      description: `Language changed to ${newLanguage === 'en' ? 'English' : newLanguage === 'es' ? 'Spanish' : 'French'}.`
    });
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setSystemSettings({ ...systemSettings, timezone: newTimezone });
    
    toast.success("Timezone updated", {
      description: `Timezone changed to ${newTimezone}.`
    });
  };

  const handleDateFormatChange = (newFormat: string) => {
    setSystemSettings({ ...systemSettings, dateFormat: newFormat });
    
    toast.success("Date format updated", {
      description: `Date format changed to ${newFormat}.`
    });
  };

  const handleTimeFormatChange = (newFormat: string) => {
    setSystemSettings({ ...systemSettings, timeFormat: newFormat });
    
    toast.success("Time format updated", {
      description: `Time format changed to ${newFormat}.`
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Settings & Administration"
        description="Configure your SecureCare Training Dashboard preferences and system settings."
      />

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* User Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Preferences
                </CardTitle>
                <CardDescription>
                  Customize your dashboard experience and personal settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" placeholder="Enter your display name" defaultValue={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="admin@securecare.com" defaultValue={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select defaultValue={systemSettings.theme} onValueChange={handleThemeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue={systemSettings.language} onValueChange={handleLanguageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue={systemSettings.timezone} onValueChange={handleTimezoneChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">Eastern Time</SelectItem>
                        <SelectItem value="PST">Pacific Time</SelectItem>
                        <SelectItem value="CST">Central Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select defaultValue={systemSettings.dateFormat} onValueChange={handleDateFormatChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Welcome Message</Label>
                    <p className="text-sm text-muted-foreground">
                      Display welcome message on dashboard load
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact View</Label>
                    <p className="text-sm text-muted-foreground">
                      Use compact layout for data tables
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={() => handleSave("preferences")} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Preferences
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications about training activities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Notification Channels</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive browser push notifications
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.push}
                        onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive text message notifications
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.sms}
                        onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notification Types</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Overdue Training Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when training is overdue
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.overdue}
                        onCheckedChange={(checked) => setNotifications({...notifications, overdue: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Training Completions</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when employees complete training
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.completions}
                        onCheckedChange={(checked) => setNotifications({...notifications, completions: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Assignments</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when new training is assigned
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.assignments}
                        onCheckedChange={(checked) => setNotifications({...notifications, assignments: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={() => handleSave("notifications")} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Notifications
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Training Settings */}
        <TabsContent value="training" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Training Configuration
                </CardTitle>
                <CardDescription>
                  Configure training durations, requirements, and automation settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Training Durations (Days)</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="level1">Level 1 Duration</Label>
                      <Input 
                        id="level1" 
                        type="number" 
                        value={trainingSettings.level1Duration}
                        onChange={(e) => setTrainingSettings({...trainingSettings, level1Duration: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level2">Level 2 Duration</Label>
                      <Input 
                        id="level2" 
                        type="number" 
                        value={trainingSettings.level2Duration}
                        onChange={(e) => setTrainingSettings({...trainingSettings, level2Duration: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level3">Level 3 Duration</Label>
                      <Input 
                        id="level3" 
                        type="number" 
                        value={trainingSettings.level3Duration}
                        onChange={(e) => setTrainingSettings({...trainingSettings, level3Duration: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultant">Consultant Duration</Label>
                      <Input 
                        id="consultant" 
                        type="number" 
                        value={trainingSettings.consultantDuration}
                        onChange={(e) => setTrainingSettings({...trainingSettings, consultantDuration: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coach">Coach Duration</Label>
                      <Input 
                        id="coach" 
                        type="number" 
                        value={trainingSettings.coachDuration}
                        onChange={(e) => setTrainingSettings({...trainingSettings, coachDuration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Automation Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-assign Next Level</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically assign next training level upon completion
                        </p>
                      </div>
                      <Switch 
                        checked={trainingSettings.autoAssign}
                        onCheckedChange={(checked) => setTrainingSettings({...trainingSettings, autoAssign: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require Advisor Approval</Label>
                        <p className="text-sm text-muted-foreground">
                          Require advisor approval before awarding certifications
                        </p>
                      </div>
                      <Switch 
                        checked={trainingSettings.requireApproval}
                        onCheckedChange={(checked) => setTrainingSettings({...trainingSettings, requireApproval: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Training Requirements</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Minimum Passing Score (%)</Label>
                      <Input type="number" defaultValue="80" min="0" max="100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Retry Attempts Allowed</Label>
                      <Input type="number" defaultValue="3" min="0" max="10" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={() => handleSave("training")} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Training Settings
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings, security, and performance options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Security Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Require 2FA for all users
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Session Timeout</Label>
                        <p className="text-sm text-muted-foreground">
                          Auto-logout after inactivity
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="space-y-2">
                      <Label>Session Timeout (minutes)</Label>
                      <Input type="number" defaultValue="30" min="5" max="480" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Performance Settings</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Page Size</Label>
                      <Select defaultValue="25">
                        <SelectTrigger>
                          <SelectValue placeholder="Select page size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 items</SelectItem>
                          <SelectItem value="25">25 items</SelectItem>
                          <SelectItem value="50">50 items</SelectItem>
                          <SelectItem value="100">100 items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cache Duration (hours)</Label>
                      <Input type="number" defaultValue="24" min="1" max="168" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Maintenance Mode</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Temporarily disable system access
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance Message</Label>
                      <Input placeholder="System is under maintenance. Please try again later." />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={() => handleSave("system")} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save System Settings
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Export, import, and manage your training data and system backups.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Data Export</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <Select defaultValue={dataSettings.exportFormat} onValueChange={(value) => setDataSettings({...dataSettings, exportFormat: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select defaultValue="all" onValueChange={(value) => {}}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="year">Last Year</SelectItem>
                          <SelectItem value="month">Last Month</SelectItem>
                          <SelectItem value="week">Last Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleExport} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Import</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Import File</Label>
                      <Input type="file" accept=".csv,.xlsx,.json" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Overwrite Existing Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Replace existing records with imported data
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <Button onClick={handleImport} variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Backup Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Automatic Backups</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically backup data
                        </p>
                      </div>
                      <Switch 
                        checked={dataSettings.autoBackup}
                        onCheckedChange={(checked) => setDataSettings({...dataSettings, autoBackup: checked})}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Backup Frequency</Label>
                        <Select defaultValue={dataSettings.backupFrequency} onValueChange={(value) => setDataSettings({...dataSettings, backupFrequency: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Retention Period (days)</Label>
                        <Input 
                          type="number" 
                          value={dataSettings.retentionDays}
                          onChange={(e) => setDataSettings({...dataSettings, retentionDays: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Cleanup</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-red-600">Clear All Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete all training data
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={handleClearData} className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Clear Data
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={() => handleSave("data")} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Data Settings
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>


    </div>
  );
}
