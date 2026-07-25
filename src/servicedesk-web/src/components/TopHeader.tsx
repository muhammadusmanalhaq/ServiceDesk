"use client";

import { Search, Sun, Moon, Bell, User, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface TopHeaderProps {
  onMenuClick: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="w-full h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 transition-colors">
      <div className="flex-1 flex items-center">
        <button 
          className="md:hidden mr-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="relative w-full max-w-md hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            placeholder="Search tickets, assets..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5">⌘K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {mounted && (
          <button 
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}
        
        <button className="relative text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 transition-colors" />
        </button>

        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer transition-colors">
          <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
      </div>
    </header>
  );
}
