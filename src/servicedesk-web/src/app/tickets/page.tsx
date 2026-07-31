"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Clock, AlertCircle, Loader2, User } from "lucide-react";
import { apiFetch, getAccessToken, API_BASE_URL } from "@/lib/apiClient";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "@/lib/AuthContext";
import { components } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlaCountdownBadge } from "@/components/SlaCountdownBadge";
import { Skeleton } from "@/components/ui/skeleton";

import { CreateTicketModal } from "@/components/CreateTicketModal";
import { TicketDetailsModal } from "@/components/TicketDetailsModal";

type TicketResponse = components["schemas"]["TicketResponse"];

const KANBAN_COLUMNS = [
  { id: "Open", title: "Open", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "InProgress", title: "In Progress", bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "PendingVerification", title: "Verify", bg: "bg-teal-500/10 border-teal-500/20" },
  { id: "Resolved", title: "Resolved", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "Closed", title: "Closed", bg: "bg-zinc-500/10 border-zinc-500/20" }
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketResponse | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";
  const ticketParam = searchParams.get("ticket");
  
  // Filters
  const [deptFilter, setDeptFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);
  const { user } = useAuth();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ticketsRes, deptsRes, usersRes] = await Promise.all([
        apiFetch.GET("/api/tickets"),
        apiFetch.GET("/api/departments"),
        apiFetch.GET("/api/users" as any)
      ]);
      
      if (ticketsRes.data) setTickets(ticketsRes.data);
      if (deptsRes.data) {
        const deptMap: Record<string, string> = {};
        deptsRes.data.forEach((d: any) => {
          if (d.id && d.name) deptMap[d.id] = d.name;
        });
        setDepartments(deptMap);
      }
      if (usersRes.data) {
        const userMap: Record<string, any> = {};
        (usersRes.data as any[]).forEach((u: any) => {
           userMap[u.id] = u;
        });
        setUsers(userMap);
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

  useEffect(() => {
    if (ticketParam && tickets.length > 0) {
      const found = tickets.find(t => t.id === ticketParam);
      if (found) {
        setSelectedTicket(found);
        setIsDetailsModalOpen(true);
      }
    } else if (!ticketParam) {
      setIsDetailsModalOpen(false);
      setSelectedTicket(null);
    }
  }, [ticketParam, tickets]);

  useEffect(() => {
    // Use a lazy factory so SignalR always reads the live token,
    // not a snapshot captured at connection-build time (which could be null
    // if this effect fires before AuthContext has set the token).
    const tokenFactory = () => getAccessToken() ?? "";

    // Don't try to connect if we have no token yet
    if (!tokenFactory()) return;

    const abortController = new AbortController();
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/tickets`, {
        accessTokenFactory: tokenFactory
      })
      .withAutomaticReconnect()
      .configureLogging({
        log: (logLevel, message) => {
          // Suppress negotiation noise that triggers Next.js dev overlay
          if (message.includes("stopped during negotiation")) return;
          if (message.includes("Unauthorized")) return;
          if (logLevel === signalR.LogLevel.Error) console.error(message);
          else if (logLevel === signalR.LogLevel.Warning) console.warn(message);
        }
      })
      .build();

    connection.on("TicketCreated", (ticket: TicketResponse) => {
      setTickets(prev => {
        if (prev.some(t => t.id === ticket.id)) return prev;
        return [...prev, ticket];
      });
    });

    connection.on("TicketUpdated", (ticket: TicketResponse) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    });

    const startConnection = async () => {
      try {
        await connection.start();
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error("SignalR Connection Error: ", err);
        }
      }
    };

    startConnection();

    return () => {
      abortController.abort();
      connection.stop();
    };
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
    <div className="flex flex-col h-auto xl:h-[calc(100vh-5rem)] overflow-x-hidden overflow-y-auto xl:overflow-hidden pb-2">
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">Tickets</h1>
          <p className="text-zinc-500 dark:text-zinc-400 transition-colors">Manage and track service requests.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 max-w-[150px] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <option value="All">All Departments</option>
            {Object.entries(departments).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 max-w-[150px] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <option value="All">All Assignees</option>
            <option value="Unassigned">Unassigned</option>
            {Object.values(users).map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={myTicketsOnly} onChange={e => setMyTicketsOnly(e.target.checked)} className="rounded border-zinc-300 text-teal-700 focus:ring-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" />
            My Tickets
          </label>
          <Button onClick={() => setIsModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto ml-2">
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

      <TicketDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedTicket(null);
          // Remove the query param when closing
          const current = new URLSearchParams(Array.from(searchParams.entries()));
          current.delete("ticket");
          const search = current.toString();
          const query = search ? `?${search}` : "";
          router.replace(`/tickets${query}`);
        }}
        onTicketUpdated={() => {
          fetchData();
        }}
        ticket={selectedTicket}
        users={users}
      />

      <div className="flex-1 w-full overflow-hidden xl:pb-2">
        {isLoading ? (
          <div className="flex xl:grid xl:grid-cols-5 gap-4 h-[65vh] min-h-[450px] xl:h-full w-full overflow-x-auto snap-x snap-mandatory pb-4 xl:pb-0">
            {[1, 2, 3, 4, 5].map((col) => (
              <div key={col} className="w-[85vw] sm:w-[350px] xl:w-full flex-shrink-0 snap-center flex flex-col bg-zinc-50 dark:bg-zinc-900/40 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800/50">
                <div className="flex items-center justify-between mb-3 px-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((card) => (
                    <Skeleton key={card} className="h-28 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[65vh] min-h-[450px] w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-full mb-4">
              <AlertCircle className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-zinc-600 dark:text-zinc-300 font-medium text-lg mb-2">No tickets yet</div>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md text-center mb-6">
              Get started by creating your first IT support ticket or check back later.
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        ) : (
          <div className="flex xl:grid xl:grid-cols-5 gap-4 h-full w-full overflow-x-auto snap-x snap-mandatory pb-4 xl:pb-0">
            {KANBAN_COLUMNS.map(column => {
              const columnTickets = tickets.filter(t => {
                const matchesSearch = !searchQuery || 
                  t.title?.toLowerCase().includes(searchQuery) ||
                  t.id?.toLowerCase().includes(searchQuery) ||
                  t.description?.toLowerCase().includes(searchQuery) ||
                  t.ticketNumber?.toString().includes(searchQuery);
                  
                const matchesDept = deptFilter === "All" || t.departmentId === deptFilter;
                const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
                const matchesAssignee = assigneeFilter === "All" 
                  ? true 
                  : (assigneeFilter === "Unassigned" ? !t.assignedToUserId : t.assignedToUserId === assigneeFilter);
                const matchesMyTickets = !myTicketsOnly || t.assignedToUserId === user?.userId;

                return matchesSearch && matchesDept && matchesPriority && matchesAssignee && matchesMyTickets && t.status === column.id;
              });
              
              return (
                <div key={column.id} className="w-[85vw] sm:w-[350px] xl:w-full flex-shrink-0 snap-center flex flex-col h-[65vh] min-h-[450px] xl:h-full bg-zinc-50 dark:bg-zinc-900/40 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800/50 overflow-hidden">
                  <div className={`mb-3 px-4 py-2 rounded-lg border flex justify-between items-center ${column.bg}`}>
                    <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">{column.title}</h3>
                    <Badge variant="secondary" className="bg-white/50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300">
                      {columnTickets.length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {columnTickets.map(ticket => (
                      <div 
                        key={ticket.id} 
                        onClick={() => {
                          const current = new URLSearchParams(Array.from(searchParams.entries()));
                          current.set("ticket", ticket.id!);
                          router.push(`/tickets?${current.toString()}`);
                        }}
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
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority || "Low"}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-medium text-primary">
                                #{ticket.ticketNumber}
                              </span>
                              {ticket.departmentId && departments[ticket.departmentId] && (
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-sm">
                                  {departments[ticket.departmentId]}
                                </span>
                              )}
                              <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-inner shrink-0" title={ticket.assignedToUserId ? users[ticket.assignedToUserId]?.fullName : "Unassigned"}>
                                {ticket.assignedToUserId && users[ticket.assignedToUserId]?.avatarUrl ? (
                                  <img src={users[ticket.assignedToUserId].avatarUrl} alt="Assignee" className="w-full h-full object-cover" />
                                ) : ticket.assignedToUserId && users[ticket.assignedToUserId]?.fullName ? (
                                  <span className="text-[10px] font-bold text-zinc-500">{users[ticket.assignedToUserId].fullName.charAt(0)}</span>
                                ) : (
                                  <User className="h-3.5 w-3.5 text-zinc-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <SlaCountdownBadge 
                              slaDeadline={ticket.slaDeadline!} 
                              isResolved={ticket.status === "Resolved" || ticket.status === "Closed"} 
                            />
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