"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { User, Palette, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("Profile");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  const tabs = [
    { id: "Profile", icon: <User className="w-4 h-4 mr-2" /> },
    { id: "Appearance", icon: <Palette className="w-4 h-4 mr-2" /> },
    { id: "Notifications", icon: <Bell className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 transition-colors">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Manage system configurations and preferences.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 flex-1">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.id}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-colors">
          {activeTab === "Profile" && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 transition-colors">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Full Name</label>
                  <p className="mt-1 text-slate-900 dark:text-slate-200 transition-colors">{user?.fullName || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</label>
                  <p className="mt-1 text-slate-900 dark:text-slate-200 transition-colors">{user?.email || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Role</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-1 border border-slate-200 dark:border-slate-700 transition-colors">
                    {user?.role || "N/A"}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-8 transition-colors">
                <Button 
                  onClick={handleSignOut}
                  variant="destructive"
                  className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {activeTab === "Appearance" && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 transition-colors">Theme Preferences</h3>
              {mounted && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 transition-colors">Select your preferred interface theme. The dark theme is recommended for enterprise environments.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                        theme === "light"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-500"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-200 mb-3 shadow-inner"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                        theme === "dark"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-500"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-950 mb-3 shadow-inner border border-slate-300 dark:border-slate-800"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Dark</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Notifications" && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 transition-colors">Notification Preferences</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Push notifications and email alerts will be configurable here in a future update.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
