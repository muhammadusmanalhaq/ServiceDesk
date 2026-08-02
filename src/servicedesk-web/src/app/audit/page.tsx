"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ScrollText, Search } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AuditLogResponse = components["schemas"]["AuditLogResponse"];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await apiFetch.GET("/api/audit-logs/recent", {
          params: { query: { limit: 100 } }
        });
        if (res.data) setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.entityName?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.changedByName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesEntity = entityFilter === "All" || log.entityName === entityFilter;
    
    const logDate = log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : "";
    const matchesDate = !dateFilter || logDate === dateFilter;

    return matchesSearch && matchesEntity && matchesDate;
  });

  const getActionColor = (action: string | null | undefined) => {
    switch (action?.toLowerCase()) {
      case "insert": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "update": return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400";
      case "delete": return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400";
      default: return "bg-zinc-100 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-400";
    }
  };

  const renderDiff = (log: AuditLogResponse) => {
    if (!log.oldValues && !log.newValues) return null;
    
    let oldObj: any = {}, newObj: any = {};
    try { oldObj = log.oldValues ? JSON.parse(log.oldValues) : {}; } catch(e){}
    try { newObj = log.newValues ? JSON.parse(log.newValues) : {}; } catch(e){}
  
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    
    return (
      <details className="mt-3 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-zinc-50 dark:bg-zinc-950 w-full max-w-2xl">
        <summary className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">View Changes</summary>
        <div className="p-3 grid grid-cols-1 gap-2">
          {allKeys.map(key => {
             const oldV = oldObj[key] !== undefined ? JSON.stringify(oldObj[key]) : undefined;
             const newV = newObj[key] !== undefined ? JSON.stringify(newObj[key]) : undefined;
             if (oldV === newV) return null;
             return (
               <div key={key} className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 last:border-0 pb-2 last:pb-0 pt-1 first:pt-0">
                 <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400 w-32">{key}:</span>
                 <div className="flex-1 flex flex-col gap-1">
                   {oldV !== undefined && <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded line-through decoration-rose-500/50 block w-fit">- {oldV}</span>}
                   {newV !== undefined && <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded block w-fit">+ {newV}</span>}
                 </div>
               </div>
             );
          })}
        </div>
      </details>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Audit Logs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Review system changes and activity history.</p>
        </div>
      </div>

      {/* CHANGED: bg-white to pop off the gray canvas */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex items-center flex-1 max-w-sm">
            <Search className="absolute left-3 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search logs by entity or user..." 
              className="pl-9 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={entityFilter} 
              onChange={e => setEntityFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="All">All Entities</option>
              <option value="Ticket">Ticket</option>
              <option value="Asset">Asset</option>
            </select>
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/50">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-700">
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Timestamp</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Entity</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Action</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-700" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32 text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ScrollText className="h-8 w-8 text-zinc-400" />
                      <span>No audit logs found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map(log => (
                  <TableRow key={log.id} className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{log.entityName}</span>
                        {log.entityName === "Ticket" ? (
                          <div className="group flex flex-col">
                            <a href={`/tickets?ticket=${log.entityId}`} className="text-sm font-semibold text-teal-700 dark:text-teal-400 hover:underline">
                              #{log.ticketNumber || "UNKNOWN"}
                            </a>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-all" title="Copy UUID">{log.entityId}</span>
                          </div>
                        ) : log.entityName === "Asset" ? (
                          <a href={`/assets?asset=${log.entityId}`} className="text-xs font-mono text-teal-700 dark:text-teal-400 hover:underline">{log.entityId}</a>
                        ) : (
                          <span className="text-xs font-mono text-zinc-500">{log.entityId}</span>
                        )}
                      </div>
                      {renderDiff(log)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-transparent font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">
                      {log.changedByName}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}