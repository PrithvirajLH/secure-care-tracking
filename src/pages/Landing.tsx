import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { 
  Users, 
  Award, 
  GraduationCap, 
  TrendingUp, 
  BarChart3, 
  Shield,
  CheckCircle,
  Star,
  ArrowRight,
  Play,
  Download,
  Zap,
  Target,
  Clock,
  Building,
  UserCheck,
  ChartBar,
  Calendar,
  Settings,
  Database,
  Bell,
  Globe,
  Lock,
  Sparkles
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Employee Management",
      description: "Comprehensive employee tracking and certification management across all levels.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Multi-Level Training",
      description: "Progressive certification system from Level 1 to Coach with detailed progress tracking.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Advanced Analytics",
      description: "Real-time insights and performance metrics to optimize training outcomes.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Compliance Tracking",
      description: "Ensure regulatory compliance with automated tracking and reporting systems.",
      color: "from-orange-500 to-red-500"
    }
  ];

  const stats = [
    { label: "Active Employees", value: "2,500+", icon: <Users className="h-4 w-4" /> },
    { label: "Certifications Awarded", value: "15,000+", icon: <Award className="h-4 w-4" /> },
    { label: "Facilities Served", value: "150+", icon: <Building className="h-4 w-4" /> },
    { label: "Success Rate", value: "98%", icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Training Director",
      company: "Healthcare Plus",
      content: "SecureCare has revolutionized our training program. The multi-level approach ensures our staff is properly certified and ready to provide exceptional care.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "HR Manager",
      company: "Senior Living Network",
      content: "The analytics and reporting features give us unprecedented visibility into our training effectiveness. Highly recommended!",
      rating: 5
    },
    {
      name: "Dr. Emily Rodriguez",
      role: "Clinical Director",
      company: "CareFirst Facilities",
      content: "The compliance tracking has saved us countless hours. Our audit preparation is now seamless and stress-free.",
      rating: 5
    }
  ];

  const benefits = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Streamlined Workflow",
      description: "Automated processes reduce administrative burden by 60%"
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Improved Outcomes",
      description: "98% certification completion rate across all levels"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Time Savings",
      description: "Reduce training coordination time by 75%"
    },
    {
      icon: <ChartBar className="h-5 w-5" />,
      title: "Data-Driven Insights",
      description: "Real-time analytics for informed decision making"
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Floating Navigation */}
      <FloatingNav
        navItems={[
          { name: "Features", link: "#features", icon: <Sparkles className="h-4 w-4" /> },
          { name: "Analytics", link: "#analytics", icon: <BarChart3 className="h-4 w-4" /> },
          { name: "Testimonials", link: "#testimonials", icon: <Star className="h-4 w-4" /> },
          { name: "Contact", link: "#contact", icon: <Globe className="h-4 w-4" /> },
        ]}
        className="top-4"
        alwaysVisible
        activeTab="features"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Next-Generation Training Platform
            </Badge>
            
                         <div className="flex items-center justify-center mb-6">
               <img src="/logo.png" alt="SecureCare" className="h-20 w-20 mr-4" />
             </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-6">
              SecureCare Training
              <span className="block text-4xl md:text-5xl mt-2">Dashboard</span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Transform your healthcare training program with our comprehensive, 
              multi-level certification system designed for modern care facilities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Everything you need to manage training programs effectively
            </p>
          </motion.div>

          <BentoGrid className="max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <BentoCard
                key={feature.title}
                name={feature.title}
                description={feature.description}
                href="#"
                cta="Learn More"
                className={`col-span-3 ${index === 0 ? 'md:col-span-2' : ''}`}
                background={
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10`} />
                }
                Icon={() => (
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                    {feature.icon}
                  </div>
                )}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Why Choose SecureCare?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Proven results and measurable impact on your training program
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white w-fit">
                      {benefit.icon}
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Trusted by healthcare facilities nationwide
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-6 italic">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Training?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of healthcare facilities already using SecureCare to improve their training programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-3 text-lg border-white text-white hover:bg-white hover:text-blue-600">
                <Download className="mr-2 h-5 w-5" />
                Download Brochure
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
                             <div className="flex items-center mb-4">
                 <img src="/logo.png" alt="SecureCare" className="h-8 w-8 mr-3" />
                 <h3 className="text-xl font-bold">SecureCare</h3>
               </div>
              <p className="text-slate-400">
                Transforming healthcare training with modern technology and proven methodologies.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li>Features</li>
                <li>Analytics</li>
                <li>Compliance</li>
                <li>Reporting</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li>About</li>
                <li>Careers</li>
                <li>Contact</li>
                <li>Support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li>Privacy</li>
                <li>Terms</li>
                <li>Security</li>
                <li>Compliance</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 SecureCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
