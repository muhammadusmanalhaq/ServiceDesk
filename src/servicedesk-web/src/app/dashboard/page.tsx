"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Monitor, Percent, AlertOctagon, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

type TicketResponse = components["schemas"]["TicketResponse"];
type AssetResponse = components["schemas"]["AssetResponse"];

const STATUS_COLORS: Record<string, string> = {
  Open: "#3b82f6",
  InProgress: "#f59e0b",
  Resolved: "#10b981",
  Closed: "#64748b",
};

export default function Dashboard() {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ticketsRes, assetsRes] = await Promise.all([
          apiFetch.GET("/api/tickets"),
          apiFetch.GET("/api/assets"),
        ]);
        
        if (ticketsRes.data) setTickets(ticketsRes.data);
        if (assetsRes.data) setAssets(assetsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "InProgress").length;
  const activeAssets = assets.filter(a => a.status === "Active").length;
  const breachedTickets = tickets.filter(t => t.slaBreached).length;
  
  const resolvedOrClosed = tickets.filter(t => t.status === "Resolved" || t.status === "Closed");
  const compliantTickets = resolvedOrClosed.filter(t => !t.slaBreached).length;
  const slaCompliance = resolvedOrClosed.length > 0 
    ? ((compliantTickets / resolvedOrClosed.length) * 100).toFixed(1) 
    : "N/A";

  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status || "Unknown"] = (acc[t.status || "Unknown"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 transition-colors">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 transition-colors">Overview of your service desk metrics and status.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Open & In Progress Tickets" 
          value={openTickets.toString()} 
          trend="" 
          trendUp={true} 
          icon={<Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} 
          subtitle="across all departments"
        />
        <StatCard 
          title="Active Assets" 
          value={activeAssets.toString()} 
          trend="" 
          trendUp={true} 
          icon={<Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} 
          subtitle="currently tracked in registry"
        />
        <StatCard 
          title="SLA Compliance %" 
          value={slaCompliance === "N/A" ? "N/A" : `${slaCompliance}%`} 
          trend="" 
          trendUp={parseFloat(slaCompliance) > 95} 
          icon={<Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} 
          subtitle="resolved within deadline"
        />
        <StatCard 
          title="Breached Tickets" 
          value={breachedTickets.toString()} 
          trend="" 
          trendUp={breachedTickets === 0}
          icon={<AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />} 
          subtitle="requiring immediate attention"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Restored bg-white to make the cards pop off the canvas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col min-h-[350px] transition-colors lg:col-span-1">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Tickets by Status</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Current active workload distribution</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#a8a29e"} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#f4f4f5" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                No tickets found.
              </div>
            )}
          </div>
        </div>

        {/* Restored bg-white for the table card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col transition-colors lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Recent Tickets</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Latest active requests requiring attention</p>
            </div>
            <Link href="/tickets" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View all</Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 uppercase border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {tickets.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-300">
                      #{t.id}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                      {t.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        t.priority === 'High' || t.priority === 'Critical' 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' 
                          : t.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[t.status || ''] || '#94a3b8' }}></span>
                        <span className="text-zinc-700 dark:text-zinc-300">{t.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(t.createdAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                      No recent tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon, subtitle }: { title: string, value: string, trend: string, trendUp: boolean, icon: React.ReactNode, subtitle?: string }) {
  return (
    // Restored bg-white here as well
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline space-x-3">
        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
        {trend && (
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            trendUp 
              ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-400/10" 
              : "text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-400/10"
          }`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>
        </div>
      )}
    </div>
  );
}