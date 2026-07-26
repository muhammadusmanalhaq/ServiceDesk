"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, Monitor, ScrollText, Settings, X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Ticket Board", href: "/tickets", icon: Ticket },
    { name: "Asset Registry", href: "/assets", icon: Monitor },
    { name: "Audit Logs", href: "/audit", icon: ScrollText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    // CHANGED: Added shadow-sm to make it stand out from the gray canvas
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col flex-shrink-0 transition-transform duration-300 md:static md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center">
          <Monitor className="w-6 h-6 text-indigo-600 dark:text-indigo-500 mr-3" />
          <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100">ServiceDesk</span>
        </div>
        <button 
          className="md:hidden text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4 px-2">Menu</h3>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                  isActive 
                    ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-500" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 border-l-4 border-transparent"
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}