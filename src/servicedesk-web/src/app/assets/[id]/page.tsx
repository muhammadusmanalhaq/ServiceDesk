"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Monitor, Package, Ticket } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AssetResponse = components["schemas"]["AssetResponse"];
type TicketResponse = components["schemas"]["TicketResponse"];

export default function AssetDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [asset, setAsset] = useState<AssetResponse | null>(null);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [departmentName, setDepartmentName] = useState<string>("Unknown");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [assetRes, deptsRes, ticketsRes] = await Promise.all([
          apiFetch.GET("/api/assets"), // Assuming no GET /api/assets/{id}, filtering locally or you can use standard
          apiFetch.GET("/api/departments"),
          apiFetch.GET("/api/tickets/asset/{assetId}", {
            params: { path: { assetId: id } }
          })
        ]);

        if (assetRes.data) {
          const found = assetRes.data.find(a => a.id === id);
          if (found) {
            setAsset(found);
            if (deptsRes.data && found.departmentId) {
              const dept = deptsRes.data.find(d => d.id === found.departmentId);
              if (dept) setDepartmentName(dept.name || "Unknown");
            }
          }
        }
        
        if (ticketsRes.data) {
          setTickets(ticketsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Package className="h-12 w-12 text-zinc-400 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Asset Not Found</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 mb-6">The asset you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => router.push("/assets")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push("/assets")} variant="ghost" size="icon" className="shrink-0 text-zinc-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {asset.name}
              </h1>
              <Badge variant={asset.status === "Active" ? "default" : "secondary"}
                     className={asset.status === "Active" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}>
                {asset.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-1">
              <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-xs">
                {asset.id?.split("-")[0]}
              </span>
              <span>&bull;</span>
              <span>{departmentName}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Details Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <CardTitle className="text-sm font-medium flex items-center text-zinc-900 dark:text-zinc-100">
                  <Monitor className="h-4 w-4 mr-2 text-teal-600 dark:text-teal-400" />
                  Asset Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">ID</div>
                  <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">{asset.id}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Department</div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-100">{departmentName}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Status</div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-100">{asset.status}</div>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Linked Tickets */}
          <div className="md:col-span-2">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 h-full">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center text-zinc-900 dark:text-zinc-100">
                    <Ticket className="h-4 w-4 mr-2 text-teal-600 dark:text-teal-400" />
                    Linked Tickets
                  </CardTitle>
                  <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800">{tickets.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <p className="text-sm">No tickets linked to this asset.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 border-b-zinc-100 dark:border-b-zinc-800/50">
                          <TableHead className="w-[100px] text-xs font-medium text-zinc-500">Ticket</TableHead>
                          <TableHead className="text-xs font-medium text-zinc-500">Title</TableHead>
                          <TableHead className="w-[120px] text-xs font-medium text-zinc-500">Status</TableHead>
                          <TableHead className="w-[150px] text-xs font-medium text-zinc-500 text-right">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tickets.map(ticket => (
                          <TableRow 
                            key={ticket.id} 
                            className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            onClick={() => router.push(`/tickets?id=${ticket.id}`)}
                          >
                            <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              #{ticket.ticketNumber}
                            </TableCell>
                            <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                              {ticket.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-zinc-500">
                              {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
