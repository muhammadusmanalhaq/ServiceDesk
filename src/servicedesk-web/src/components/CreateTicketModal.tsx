"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";

type CreateTicketRequest = components["schemas"]["CreateTicketRequest"];

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export function CreateTicketModal({ isOpen, onClose, onTicketCreated }: CreateTicketModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    departmentId: "",
    assetId: "",
    priority: "Medium",
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch departments and assets for dropdowns
      apiFetch.GET("/api/departments").then(res => {
        if (res.data) setDepartments(res.data);
      });
      apiFetch.GET("/api/assets").then(res => {
        if (res.data) setAssets(res.data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateTicketRequest = {
        title: formData.title,
        description: formData.description,
        departmentId: formData.departmentId || undefined,
        assetId: formData.assetId || undefined,
        priority: formData.priority,
      };

      const res = await apiFetch.POST("/api/tickets", {
        body: payload
      });

      if (res.error) {
        setError(res.error.title || "Failed to create ticket");
      } else {
        setFormData({ title: "", description: "", departmentId: "", assetId: "", priority: "Medium" });
        onTicketCreated();
        onClose();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              required 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
              placeholder="E.g., Cannot access email" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea 
              id="description" 
              required 
              rows={3} 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Describe the issue in detail..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <select 
                id="department" 
                value={formData.departmentId} 
                onChange={e => setFormData({...formData, departmentId: e.target.value})}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">(Select Department)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select 
                id="priority" 
                required
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset">Related Asset (Optional)</Label>
            <select 
              id="asset" 
              value={formData.assetId} 
              onChange={e => setFormData({...formData, assetId: e.target.value})}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">(None)</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
