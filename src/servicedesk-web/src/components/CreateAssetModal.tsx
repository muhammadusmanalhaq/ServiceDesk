"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiFetch } from "@/lib/apiClient";

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetCreated: () => void;
  departments: Record<string, string>;
}

export function CreateAssetModal({ isOpen, onClose, onAssetCreated, departments }: CreateAssetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    status: "Active",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const stored = localStorage.getItem("service_desk_user");
      let token = "";
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.accessToken || "";
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
        setError(res.error.title || "Failed to create asset");
      } else {
        setFormData({ name: "", departmentId: "", status: "Active" });
        onAssetCreated();
        onClose();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 w-screen h-screen m-0 p-0 top-0 left-0">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto border border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-100">Create Asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm p-2 bg-red-900/20 rounded">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Asset Name</Label>
            <Input 
              id="name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-indigo-500" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="text-slate-300">Department</Label>
            <select 
              id="department" 
              value={formData.departmentId} 
              onChange={e => setFormData({...formData, departmentId: e.target.value})}
              className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">(None)</option>
              <option value="11111111-1111-1111-1111-111111111111">IT</option>
              <option value="22222222-2222-2222-2222-222222222222">Operations</option>
              <option value="33333333-3333-3333-3333-333333333333">Field Support</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-slate-300">Status</Label>
            <select 
              id="status" 
              required
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Asset"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
