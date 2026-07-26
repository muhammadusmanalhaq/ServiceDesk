"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export function CreateTicketModal({ isOpen, onClose, onTicketCreated }: CreateTicketModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States to hold the real data from your database
  const [departments, setDepartments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    departmentId: "",
    assetId: "",
    priority: "Medium",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch the real departments and assets from the DB when the modal opens
  useEffect(() => {
    if (isOpen) {
      apiFetch.GET("/api/departments").then(res => {
        if (res.data) setDepartments(res.data);
      });
      apiFetch.GET("/api/assets").then(res => {
        if (res.data) setAssets(res.data);
      });
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const stored = localStorage.getItem("service_desk_user") || localStorage.getItem("user");
      let token = "";
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token || parsed.accessToken || "";
      }

      // We explicitly send 'null' instead of omitting the field or sending ""
      // This stops ASP.NET Core from defaulting to 00000000-0000-0000-0000-000000000000
      const payload: any = {
        title: formData.title,
        description: formData.description,
        departmentId: formData.departmentId, 
        priority: formData.priority,
        assetId: formData.assetId ? formData.assetId : null
      };

      const res = await apiFetch.POST("/api/tickets", {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: payload
      });

      if (res.error) {
        if (res.error.errors && typeof res.error.errors === 'object') {
          const validationErrors = Object.values(res.error.errors).flat().join(" | ");
          setError(`Validation Failed: ${validationErrors}`);
        } else {
          setError(res.error.title || res.error.message || "Failed to create ticket.");
        }
      } else {
        setFormData({ title: "", description: "", departmentId: "", assetId: "", priority: "Medium" });
        onTicketCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen transition-colors">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden relative transition-colors">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create New Ticket</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm font-medium p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
            <input 
              id="title" 
              required 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
              placeholder="E.g., Cannot access email" 
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea 
              id="description" 
              required 
              rows={3} 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
              placeholder="Describe the issue in detail..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="department" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Department</label>
              <select 
                id="department" 
                required 
                value={formData.departmentId} 
                onChange={e => setFormData({...formData, departmentId: e.target.value})}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="" disabled className="text-zinc-500 dark:text-zinc-400">(Select Department)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="priority" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Priority</label>
              <select 
                id="priority" 
                required
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Related Asset (Optional)</label>
            <select 
              id="asset" 
              value={formData.assetId} 
              onChange={e => setFormData({...formData, assetId: e.target.value})}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="" className="text-zinc-500 dark:text-zinc-400">(None)</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}