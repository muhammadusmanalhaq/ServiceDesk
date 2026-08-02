"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Monitor, Percent, AlertOctagon, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { STATUS_COLORS, TicketStatus } from "@/constants/colors";
import { SlaCountdownBadge } from "@/components/SlaCountdownBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

type TicketResponse = components["schemas"]["TicketResponse"];
type AssetResponse = components["schemas"]["AssetResponse"];

export default function Dashboard() {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const { user } = useAuth();
  
  useEffect(() => {
    if (user && user.role === "Agent") {
      router.push("/tickets");
      return;
    }

    async function loadData() {
      try {
        const [ticketsRes, metricsRes] = await Promise.all([
          apiFetch.GET("/api/tickets"),
          apiFetch.GET("/api/metrics/dashboard"),
        ]);
        
        if (ticketsRes.data) setTickets(ticketsRes.data);
        if (metricsRes.data) setMetrics(metricsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <Skeleton className="h-[350px] lg:col-span-3 rounded-xl" />
          <Skeleton className="h-[350px] lg:col-span-1 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl mt-6" />
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "InProgress").length;
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
          trend={metrics?.deltas?.openTickets ? `${metrics.deltas.openTickets > 0 ? '+' : ''}${metrics.deltas.openTickets.toFixed(1)}% WoW` : ""} 
          trendUp={metrics?.deltas?.openTickets <= 0} 
          icon={<Ticket className="w-5 h-5 text-teal-700 dark:text-teal-400" />} 
          subtitle="across all departments"
        />
        <StatCard 
          title="SLA Compliance %" 
          value={slaCompliance === "N/A" ? "N/A" : `${slaCompliance}%`} 
          trend={metrics?.deltas?.slaCompliance ? `${metrics.deltas.slaCompliance > 0 ? '+' : ''}${metrics.deltas.slaCompliance.toFixed(1)}% WoW` : ""} 
          trendUp={metrics?.deltas?.slaCompliance >= 0} 
          icon={<Percent className="w-5 h-5 text-teal-700 dark:text-teal-400" />} 
          subtitle="resolved within deadline"
        />
        <StatCard 
          title="Breached Tickets" 
          value={breachedTickets.toString()} 
          trend={metrics?.deltas?.breachedTickets ? `${metrics.deltas.breachedTickets > 0 ? '+' : ''}${metrics.deltas.breachedTickets.toFixed(1)}% WoW` : ""} 
          trendUp={metrics?.deltas?.breachedTickets <= 0}
          icon={<AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />} 
          subtitle="requiring immediate attention"
        />
        <StatCard 
          title="Active Assets" 
          value={metrics?.totalActiveAssets !== undefined ? metrics.totalActiveAssets.toString() : "..."}
          trend={metrics?.deltas?.activeAssets ? `${metrics.deltas.activeAssets > 0 ? '+' : ''}${metrics.deltas.activeAssets.toFixed(1)}% WoW` : ""} 
          trendUp={metrics?.deltas?.activeAssets >= 0} 
          icon={<Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} 
          subtitle="currently tracked in registry"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart for SLA Trend */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col min-h-[350px] transition-colors lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">30-Day SLA Trend</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Tickets resolved in vs out of SLA</p>
            </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            {metrics?.slaTrend && metrics.slaTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.slaTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#f4f4f5", borderRadius: '8px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="compliant" name="Met SLA" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="breached" name="Breached SLA" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                Not enough data for trend analysis.
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
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
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as TicketStatus] || STATUS_COLORS.Open} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-lg text-sm text-zinc-800 dark:text-zinc-100">
                          <span className="font-medium">{payload[0].name}: </span>
                          <span>{payload[0].value}</span>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                No tickets found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col transition-colors lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Recent Tickets</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Latest active requests requiring attention</p>
            </div>
            <Link href="/tickets" className="text-sm font-medium text-teal-700 dark:text-teal-400 hover:underline">View all</Link>
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
                  <tr 
                    key={t.id} 
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/tickets?ticket=${t.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-primary">
                      #{t.ticketNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                      {t.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        t.priority === 'High' || t.priority === 'Critical' 
                          ? 'bg-status-critical/10 text-status-critical-text' 
                          : t.priority === 'Medium'
                            ? 'bg-status-medium/10 text-status-medium-text'
                            : 'bg-status-open/10 text-status-open-text'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SlaCountdownBadge slaDeadline={t.slaDeadline!} isResolved={t.status === "Resolved" || t.status === "Closed"} />
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