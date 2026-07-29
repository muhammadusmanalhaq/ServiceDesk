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
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFullName(user.fullName);
      setAvatarUrl((user as any).avatarUrl || "");
    }
  }, [user]);

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Lazy import apiFetch to avoid circular deps if any, or assume it's available
      const { apiFetch } = await import("@/lib/apiClient");
      const { data, error } = await apiFetch.PUT("/api/auth/profile", {
        body: {
          fullName,
          avatarUrl: avatarUrl || null
        } as any
      });
      if (!error && data) {
        // AuthResponse includes accessToken, we update local context
        login(data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "Profile", icon: <User className="w-4 h-4 mr-2" /> },
    { id: "Appearance", icon: <Palette className="w-4 h-4 mr-2" /> }
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 transition-colors">Manage system configurations and preferences.</p>
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
                    ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.id}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {/* CHANGED: bg-white to pop off the gray canvas */}
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm transition-colors">
          {activeTab === "Profile" && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2 transition-colors">Profile Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xl overflow-hidden shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Avatar URL</label>
                    <input 
                      type="url" 
                      value={avatarUrl} 
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400">Email Address (Read-only)</label>
                  <p className="mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-600 dark:text-zinc-400 transition-colors">{user?.email || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400">Role</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mt-2 border border-zinc-200 dark:border-zinc-700 transition-colors">
                    {user?.role || "N/A"}
                  </span>
                </div>
                
                <div className="pt-4 flex items-center gap-4">
                   <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                     {isSaving ? "Saving..." : "Save Changes"}
                   </Button>
                   {saveSuccess && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Profile updated successfully.</span>}
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-8 transition-colors flex justify-end">
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
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2 transition-colors">Theme Preferences</h3>
              {mounted && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 transition-colors">Select your preferred interface theme. The dark theme is recommended for enterprise environments.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                        theme === "light"
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10 ring-1 ring-teal-500"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-200 mb-3 shadow-inner"></div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                        theme === "dark"
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10 ring-1 ring-teal-500"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-zinc-950 mb-3 shadow-inner border border-zinc-300 dark:border-zinc-800"></div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">Dark</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}