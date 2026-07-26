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

  const filteredLogs = logs.filter(log => 
    log.entityName?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.changedByName?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string | null | undefined) => {
    switch (action?.toLowerCase()) {
      case "insert": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "update": return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400";
      case "delete": return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400";
      default: return "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review system changes and activity history.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search logs by entity or user..." 
              className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="border-b border-slate-200 dark:border-slate-700">
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Timestamp</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Entity</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Action</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32 text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ScrollText className="h-8 w-8 text-slate-400" />
                      <span>No audit logs found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map(log => (
                  <TableRow key={log.id} className="border-b border-slate-200 dark:border-slate-700">
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{log.entityName}</span>
                        <span className="text-xs font-mono text-slate-500">{log.entityId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-transparent font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">
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
