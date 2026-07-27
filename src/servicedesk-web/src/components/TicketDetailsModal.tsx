"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "@/lib/AuthContext";

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated: () => void;
  ticket: any; 
}

export function TicketDetailsModal({ isOpen, onClose, onTicketUpdated, ticket }: TicketDetailsModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !ticket) return null;

  // IT Agent claiming the fix
  const handleClaimFix = async () => {
    if (!resolutionNote.trim()) {
      setError("You must provide a resolution note before claiming a fix.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch.POST("/api/tickets/{id}/claim", {
        params: { path: { id: ticket.id } },
        body: { resolutionNote } as any
      });

      if (res.error) throw new Error("Failed to claim ticket.");
      onTicketUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin verifying and closing
  const handleVerify = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Using 'as any' to bypass strict typing just in case your local api-types.ts 
      // hasn't been regenerated since Claude deployed the new backend endpoints.
      const res = await apiFetch.POST("/api/tickets/{id}/verify" as any, {
        params: { path: { id: ticket.id } },
        // The C# backend VerifyTicketRequest DTO specifically expects an 'accept' boolean.
        body: { accept: true, approved: true, isApproved: true } as any 
      });

      if (res.error) {
        // Extract the exact error message Claude's backend is throwing
        const serverError = res.error.title || res.error.detail || JSON.stringify(res.error);
        throw new Error(`Backend Error: ${serverError}`);
      }
      
      onTicketUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{ticket.title}</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">#{ticket.id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {error && (
             <div className="text-red-600 dark:text-red-400 text-sm font-medium p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
               {error}
             </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-zinc-500 mb-1">Description</h4>
            <p className="text-zinc-800 dark:text-zinc-200 text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div>
               <h4 className="text-xs font-medium text-zinc-500">Status</h4>
               <span className="inline-block mt-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">
                 {ticket.status}
               </span>
            </div>
            <div>
               <h4 className="text-xs font-medium text-zinc-500">Priority</h4>
               <span className="inline-block mt-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">
                 {ticket.priority}
               </span>
            </div>
          </div>

          {/* ENGINEER VIEW: Ticket is Open/InProgress */}
          {(ticket.status === "Open" || ticket.status === "InProgress") && user?.role !== "Admin" && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Engineer Resolution
              </h4>
              <textarea 
                rows={3} 
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe what you fixed (e.g., 'Rebooted VPN server')..."
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={handleClaimFix}
                disabled={isSubmitting}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Fix for Verification"}
              </button>
            </div>
          )}

          {/* ADMIN VIEW: Ticket is Pending Verification */}
          {ticket.status === "PendingVerification" && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-lg -mx-2">
              <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Admin Verification Required
              </h4>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Engineer Notes:</p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                  {ticket.resolutionNote || "No notes provided."}
                </p>
              </div>
              {user?.role === "Admin" && (
                <button 
                  onClick={handleVerify}
                  disabled={isSubmitting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center mt-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Close Ticket"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
