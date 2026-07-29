"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch, getAccessToken } from "@/lib/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { SlaCountdownBadge } from "./SlaCountdownBadge";
import { formatDistanceToNow } from "date-fns";
import { Copy, X, AlertCircle, Loader2, CheckCircle, Paperclip, UploadCloud, Download, File } from "lucide-react";
import { toast } from "sonner";
interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated: () => void;
  ticket: any; 
  users: Record<string, any>;
}

export function TicketDetailsModal({ isOpen, onClose, onTicketUpdated, ticket, users }: TicketDetailsModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [activity, setActivity] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  const fetchActivity = async () => {
    if (!ticket) return;
    setIsLoadingActivity(true);
    try {
      // For a unified thread, we'd fetch comments and audit logs and merge them
      const [commentsRes, auditRes] = await Promise.all([
        apiFetch.GET("/api/tickets/{id}/comments", { params: { path: { id: ticket.id } } }),
        apiFetch.GET("/api/audit", { params: { query: { entityId: ticket.id } } })
      ]);
      
      const thread: any[] = [];
      if (commentsRes.data) {
        commentsRes.data.forEach((c: any) => thread.push({ ...c, type: 'comment', timestamp: new Date(c.createdAt).getTime() }));
      }
      if (auditRes.data) {
        auditRes.data.forEach((a: any) => thread.push({ ...a, type: 'audit', timestamp: new Date(a.createdAt).getTime() }));
      }
      
      thread.sort((a, b) => a.timestamp - b.timestamp);
      setActivity(thread);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticket) {
       fetchActivity();
    }
  }, [isOpen, ticket]);

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
      toast.success("Fix submitted for verification");
      onTicketUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to submit fix");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async (userId: string) => {
    try {
      const res = await apiFetch.POST("/api/tickets/{id}/assign", {
        params: { path: { id: ticket.id } },
        body: { userId } as any
      });
      if (!res.error) {
        const assigneeName = userId && users[userId] ? users[userId].fullName : "Unassigned";
        toast.success(`Assigned to ${assigneeName}`);
        onTicketUpdated();
      } else {
        toast.error("Failed to reassign ticket");
      }
    } catch (err) {
      toast.error("Failed to reassign ticket");
      console.error(err);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await apiFetch.PUT("/api/tickets/{id}/status", {
        params: { path: { id: ticket.id } },
        body: { status: newStatus }
      });
      if (!res.error) {
        toast.success(`Status updated to ${newStatus.replace(/([A-Z])/g, ' $1').trim()}`);
        onTicketUpdated();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch.POST("/api/tickets/{id}/comments", {
        params: { path: { id: ticket.id } },
        body: { content: newComment }
      });
      if (!res.error) {
        toast.success("Comment posted");
      }
      setNewComment("");
      fetchActivity();
    } catch (err) {
      toast.error("Failed to post comment");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin verifying and closing
  const handleVerify = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch.POST("/api/tickets/{id}/verify" as any, {
        params: { path: { id: ticket.id } },
        body: { accept: true, approved: true, isApproved: true } as any 
      });

      if (res.error) {
        const serverError = res.error.title || res.error.detail || JSON.stringify(res.error);
        throw new Error(`Backend Error: ${serverError}`);
      }
      
      toast.success("Ticket verified and closed");
      onTicketUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error("Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    const uploadToast = toast.loading(`Uploading ${file.name}…`);
    try {
      const sasRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5093"}/api/attachments/generate-sas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ fileName: file.name })
      });
      if (!sasRes.ok) throw new Error("Failed to generate upload link");
      const { sasUrl, blobPath } = await sasRes.json();

      const uploadRes = await fetch(sasUrl, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob" },
        body: file
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");

      const regRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5093"}/api/attachments/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ ticketId: ticket.id, blobPath, fileName: file.name })
      });
      if (!regRes.ok) throw new Error("Failed to register attachment");

      toast.success(`${file.name} uploaded`, { id: uploadToast });
      onTicketUpdated();
    } catch (err: any) {
      setError(err.message);
      toast.error(`Upload failed: ${err.message}`, { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 shadow-2xl w-full max-w-2xl h-full absolute right-0 flex flex-col transition-transform transform translate-x-0">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{ticket.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-mono font-semibold text-primary">#{ticket.ticketNumber}</span>
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                {ticket.id}
                <button
                  onClick={() => navigator.clipboard.writeText(ticket.id)}
                  className="hover:text-foreground transition-colors"
                  title="Copy UUID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>
            </div>
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

          <div className="grid grid-cols-3 gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="min-w-0">
               <h4 className="text-xs font-medium text-zinc-500">Status / SLA</h4>
               <div className="mt-1 space-y-1.5">
                 <select 
                   value={ticket.status} 
                   onChange={(e) => handleUpdateStatus(e.target.value)}
                   className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm rounded px-2 py-1 w-full"
                 >
                   <option value="Open">Open</option>
                   <option value="InProgress">In Progress</option>
                   <option value="PendingVerification">Pending Verification</option>
                   <option value="Resolved">Resolved</option>
                   <option value="Closed">Closed</option>
                 </select>
                 <SlaCountdownBadge slaDeadline={ticket.slaDeadline} isResolved={ticket.status === "Resolved" || ticket.status === "Closed"} />
               </div>
            </div>
            <div className="min-w-0">
               <h4 className="text-xs font-medium text-zinc-500">Priority</h4>
               <span className="inline-block mt-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">
                 {ticket.priority}
               </span>
            </div>
            <div className="min-w-0">
               <h4 className="text-xs font-medium text-zinc-500">Assignee</h4>
               <div className="mt-1">
                 {(user?.role === "Admin" || user?.role === "Manager") ? (
                   <select 
                     value={ticket.assignedToUserId || ""} 
                     onChange={(e) => handleAssign(e.target.value)}
                     className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm rounded px-2 py-1 w-full"
                   >
                     <option value="">Unassigned</option>
                     {Object.values(users).map((u: any) => (
                       <option key={u.id} value={u.id}>{u.fullName}</option>
                     ))}
                   </select>
                 ) : (
                   <span className="inline-block px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">
                     {ticket.assignedToUserId && users[ticket.assignedToUserId] ? users[ticket.assignedToUserId].fullName : "Unassigned"}
                   </span>
                 )}
               </div>
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
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-teal-500"
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
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3 bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-lg -mx-2">
              <h4 className="text-sm font-medium text-teal-900 dark:text-teal-300 flex items-center gap-2">
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

          {/* Attachments Section */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
             <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4" /> Attachments
             </h4>
             <div 
               onDragOver={onDragOver} 
               onDragLeave={onDragLeave} 
               onDrop={onDrop}
               className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors mb-4
                 ${isDragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'}
               `}
             >
                <UploadCloud className={`w-8 h-8 mb-2 ${isDragging ? 'text-teal-700' : 'text-zinc-400'}`} />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-2">
                   Drag & drop a file here, or <label className="text-teal-700 dark:text-teal-400 cursor-pointer font-medium hover:underline">browse<input type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} /></label>
                </p>
                {isUploading && <div className="text-xs text-teal-700 dark:text-teal-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</div>}
             </div>

             {ticket.attachments?.length > 0 ? (
               <ul className="space-y-2">
                 {ticket.attachments.map((att: any) => (
                   <li key={att.id} className="flex justify-between items-center p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                     <div className="flex items-center gap-2 overflow-hidden">
                       <Paperclip className="w-4 h-4 text-zinc-500 shrink-0" />
                       <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{att.fileName}</span>
                     </div>
                     <button className="text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1 shrink-0" title="Downloading requires SAS from API in real app, but we display the button">
                        <Download className="w-4 h-4" />
                     </button>
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-zinc-500 italic">No attachments.</p>
             )}
          </div>

          {/* Activity Thread */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
             <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">Activity Thread</h4>
             
             <div className="space-y-4 mb-4">
               {isLoadingActivity ? (
                 <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
               ) : activity.length > 0 ? (
                 activity.map(item => (
                   <div key={item.id || item.timestamp} className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-xs overflow-hidden">
                       {item.type === 'audit' ? <File className="w-4 h-4 text-zinc-400" /> : (
                         item.authorAvatarUrl ? <img src={item.authorAvatarUrl} alt="" className="w-full h-full object-cover" /> : item.authorName?.charAt(0) || 'U'
                       )}
                     </div>
                     <div className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                       <div className="flex justify-between items-start mb-1">
                         <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                           {item.type === 'audit' ? item.userEmail || 'System' : item.authorName}
                         </span>
                         <span className="text-[10px] text-zinc-500">
                           {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                         </span>
                       </div>
                       <div className="text-sm text-zinc-700 dark:text-zinc-300">
                         {item.type === 'audit' ? (
                           <span className="text-zinc-500">Updated {item.action}</span>
                         ) : (
                           item.content
                         )}
                       </div>
                     </div>
                   </div>
                 ))
               ) : (
                 <p className="text-sm text-zinc-500 italic">No activity yet.</p>
               )}
             </div>

             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newComment}
                 onChange={e => setNewComment(e.target.value)}
                 placeholder="Write a comment..." 
                 className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                 onKeyDown={e => e.key === 'Enter' && handlePostComment()}
               />
               <button 
                 onClick={handlePostComment}
                 disabled={isSubmitting || !newComment.trim()}
                 className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
               >
                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
