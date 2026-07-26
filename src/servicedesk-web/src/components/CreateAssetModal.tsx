"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetCreated: () => void;
  departments: Record<string, string>;
}

export function CreateAssetModal({ isOpen, onClose, onAssetCreated, departments }: CreateAssetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    status: "Active",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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

      const res = await apiFetch.POST("/api/assets", {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: {
          name: formData.name,
          departmentId: formData.departmentId || undefined,
          status: formData.status
        } as any
      });

      if (res.error) {
        if (res.error.errors && typeof res.error.errors === 'object') {
          const validationErrors = Object.values(res.error.errors).flat().join(" | ");
          setError(`Validation Failed: ${validationErrors}`);
        } else {
          setError(res.error.title || "Failed to create asset");
        }
      } else {
        setFormData({ name: "", departmentId: "", status: "Active" });
        onAssetCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen transition-colors">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative transition-colors">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create Asset</h2>
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
            <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Asset Name</label>
            <input 
              id="name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
            />
          </div>

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
              <option value="11111111-1111-1111-1111-111111111111">IT</option>
              <option value="22222222-2222-2222-2222-222222222222">Operations</option>
              <option value="33333333-3333-3333-3333-333333333333">Field Support</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
            <select 
              id="status" 
              required
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}