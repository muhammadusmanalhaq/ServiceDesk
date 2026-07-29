"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { Toaster } from "sonner";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    // CHANGED: bg-zinc-100 is a true gray that kills the blinding white glare
    <div className="flex h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950 transition-colors">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader onMenuClick={() => setIsSidebarOpen(true)} />
        
        {/* CHANGED: Canvas is now zinc-100 so the white cards actually pop */}
        <main className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-950 p-4 md:p-6 lg:p-8 transition-colors">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      <Toaster
        richColors
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "font-sans text-sm",
          },
        }}
      />
    </div>
  );
}