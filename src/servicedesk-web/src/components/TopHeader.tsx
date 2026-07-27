"use client";

import { Search, Sun, Moon, User, Menu, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

interface TopHeaderProps {
  onMenuClick: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Keep the input text in sync with the URL if they refresh
    setSearchTerm(searchParams.get("search") || "");
    
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchParams]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchTerm.trim()) {
        router.push(`/tickets?search=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        router.push(`/tickets`);
      }
    }
  };

  return (
    <header className="w-full h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm sticky top-0 z-10 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 transition-colors">
      <div className="flex-1 flex items-center">
        <button 
          className="md:hidden mr-4 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="relative w-full max-w-md hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            className="block w-full pl-10 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg leading-5 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            placeholder="Search tickets by ID, title, or description..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5">↵ Enter</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {mounted && (
          <button 
            className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}
        
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <User className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-50">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.fullName || "User"}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {user?.email || ""}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}