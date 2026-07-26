"use client";

import React, { useEffect, useState } from "react";
import { Plus, Clock, AlertCircle, Loader2, User } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { CreateTicketModal } from "@/components/CreateTicketModal";

type TicketResponse = components["schemas"]["TicketResponse"];

const KANBAN_COLUMNS = [
  { id: "Open", title: "Open", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "InProgress", title: "In Progress", bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "Resolved", title: "Resolved", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "Closed", title: "Closed", bg: "bg-zinc-500/10 border-zinc-500/20" }
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ticketsRes, deptsRes] = await Promise.all([
        apiFetch.GET("/api/tickets"),
        apiFetch.GET("/api/departments")
      ]);
      
      if (ticketsRes.data) setTickets(ticketsRes.data);
      if (deptsRes.data) {
        const deptMap: Record<string, string> = {};
        deptsRes.data.forEach((d: any) => {
          if (d.id && d.name) deptMap[d.id] = d.name;
        });
        setDepartments(deptMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority?.toLowerCase()) {
      case "critical": return "text-rose-400 bg-rose-500/20 border border-rose-500/30";
      case "high": return "text-rose-400 bg-rose-500/20 border border-rose-500/30";
      case "medium": return "text-amber-400 bg-amber-500/20 border border-amber-500/30";
      default: return "text-blue-400 bg-blue-500/20 border border-blue-500/30";
    }
  };

  const getSlaText = (slaDeadline: string | null | undefined, status: string | null | undefined) => {
    if (!slaDeadline) return "N/A";
    const diff = new Date(slaDeadline).getTime() - new Date().getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 0) {
      if (status === "Resolved" || status === "Closed") return "Completed";
      return "Overdue";
    }
    if (hours < 24) return `Due in ${hours}h`;
    return `Due in ${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">Tickets</h1>
          <p className="text-zinc-500 dark:text-zinc-400 transition-colors">Manage and track service requests.</p>
        </div>
        <div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </div>
      </div>

      <CreateTicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onTicketCreated={() => {
          fetchData(); 
        }} 
      />

      <div className="flex-1 overflow-x-auto pb-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {KANBAN_COLUMNS.map(column => {
              const columnTickets = tickets.filter(t => t.status === column.id);
              
              return (
                <div key={column.id} className="w-full flex flex-col h-full max-h-[calc(100vh-200px)]">
                  <div className={`mb-3 px-4 py-2 rounded-lg border flex justify-between items-center ${column.bg}`}>
                    <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">{column.title}</h3>
                    <Badge variant="secondary" className="bg-white/50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300">
                      {columnTickets.length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {columnTickets.map(ticket => (
                      <div 
                        key={ticket.id} 
                        // CHANGED: bg-white to make the tickets pop off the canvas
                        className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md dark:hover:border-zinc-700 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 text-sm leading-snug">
                            {ticket.title}
                          </h4>
                        </div>
                        
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                          {ticket.description}
                        </p>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority || "Low"}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                                #{ticket.id?.split("-")[0]}
                              </span>
                              {ticket.departmentId && departments[ticket.departmentId] && (
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-sm">
                                  {departments[ticket.departmentId]}
                                </span>
                              )}
                              <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                                <User className="h-3.5 w-3.5 text-zinc-400" />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            {ticket.slaBreached ? (
                              <div className="flex items-center text-xs font-medium text-rose-500 dark:text-rose-400">
                                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                Breached
                              </div>
                            ) : (
                              <div className="flex items-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                {getSlaText(ticket.slaDeadline, ticket.status)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {columnTickets.length === 0 && (
                      <div className="h-24 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-sm text-zinc-500">
                        No tickets
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}