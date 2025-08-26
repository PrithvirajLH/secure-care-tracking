"use client";
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { cn } from "@/lib/utils";


export const FloatingNav = ({
  navItems,
  className,
  alwaysVisible,
  activeTab,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: JSX.Element;
  }[];
  className?: string;
  alwaysVisible?: boolean;
  activeTab?: string;
}) => {
  const { scrollYProgress } = useScroll();

  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (alwaysVisible) {
      setVisible(true);
      return;
    }
    if (typeof current === "number") {
      let direction = current! - scrollYProgress.getPrevious()!;
      if (scrollYProgress.get() < 0.05) {
        setVisible(false);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: alwaysVisible ? 0 : -100,
        }}
        animate={{
          y: visible || alwaysVisible ? 0 : -100,
          opacity: visible || alwaysVisible ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-transparent dark:border-white/[0.2] rounded-full dark:bg-black bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] px-6 py-3 items-center justify-center space-x-6",
          className
        )}
      >
        {navItems.map((navItem: any, idx: number) => {
          const isActive = activeTab === navItem.link.replace('#', '');
          return (
            <a
              key={`link=${idx}`}
              href={navItem.link}
              className={cn(
                "relative dark:text-neutral-50 items-center flex space-x-2 text-neutral-600 dark:hover:text-neutral-300 hover:text-neutral-500 transition-all duration-300 group"
              )}
            >
              <motion.div
                className={cn(
                  "relative p-2 rounded-lg",
                  isActive 
                    ? "bg-accent text-accent-foreground shadow-lg" 
                    : "hover:bg-accent/60"
                )}
                initial={{ scale: 1 }}
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isActive ? "hsl(var(--accent))" : "transparent"
                }}
                whileHover={{ scale: isActive ? 1.15 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ 
                  type: "spring", 
                  bounce: 0.2, 
                  duration: 0.4,
                  ease: "easeInOut"
                }}
              >
                <motion.span 
                  className="block sm:hidden"
                  animate={{ 
                    color: isActive ? "#ffffff" : "#52525b"
                  }}
                  transition={{ 
                    duration: 0.3,
                    ease: "easeInOut"
                  }}
                >
                  {navItem.icon}
                </motion.span>
                <motion.span 
                  className="hidden sm:block text-sm font-medium"
                  animate={{ 
                    color: isActive ? "#ffffff" : "#52525b"
                  }}
                  transition={{ 
                    duration: 0.3,
                    ease: "easeInOut"
                  }}
                >
                  {navItem.name}
                </motion.span>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-accent/20 rounded-lg"
                    layoutId="activeTab"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      type: "spring", 
                      bounce: 0.3, 
                      duration: 0.5,
                      ease: "easeInOut"
                    }}
                  />
                )}
                
                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 bg-accent/10 rounded-lg opacity-0 group-hover:opacity-100"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            </a>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};
