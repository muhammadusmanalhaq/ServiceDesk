"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Loader2, Monitor } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EditAssetModal } from "@/components/EditAssetModal";
import { CreateAssetModal } from "@/components/CreateAssetModal";

type AssetResponse = components["schemas"]["AssetResponse"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selectedAsset, setSelectedAsset] = useState<AssetResponse | null>(null);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [assetsRes, deptsRes] = await Promise.all([
        apiFetch.GET("/api/assets"),
        apiFetch.GET("/api/departments")
      ]);
      if (assetsRes.data) setAssets(assetsRes.data);
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

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    const matchesDept = deptFilter === "All" || a.departmentId === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">Assets</h1>
          <p className="text-zinc-500 dark:text-zinc-400 transition-colors">Manage and track company hardware and software.</p>
        </div>
        <div>
          <Button onClick={() => setIsAddAssetModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      <CreateAssetModal
        isOpen={isAddAssetModalOpen}
        onClose={() => setIsAddAssetModalOpen(false)}
        onAssetCreated={() => fetchData()}
        departments={departments}
      />

      <EditAssetModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onAssetUpdated={() => fetchData()}
        asset={selectedAsset}
        departments={departments}
      />

      {/* CHANGED: bg-white to pop off the gray canvas */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col transition-colors">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex items-center flex-1 max-w-sm">
            <Search className="absolute left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input 
              placeholder="Search assets..." 
              className="pl-9 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-xs truncate"
            >
              <option value="All">All Departments</option>
              {Object.entries(departments).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/50">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">ID</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Name</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Department</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Status</TableHead>
                <TableHead className="font-semibold text-zinc-600 dark:text-zinc-300">Last Updated</TableHead>
                <TableHead className="text-right font-semibold text-zinc-600 dark:text-zinc-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-64 border-b-0">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-full">
                        <Monitor className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300 font-medium">No assets found</div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                        Get started by adding your first hardware or software asset to the registry.
                      </p>
                      <Button onClick={() => setIsAddAssetModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Asset
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map(asset => (
                  <TableRow 
                    key={asset.id} 
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {asset.id?.split("-")[0]}
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                      {asset.name}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {asset.departmentId && departments[asset.departmentId] 
                        ? <Badge variant="outline">{departments[asset.departmentId]}</Badge>
                        : <span className="text-zinc-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.status === "Active" ? "default" : "secondary"}
                             className={asset.status === "Active" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                      {/* Fake updated time to demonstrate date-fns relative dates */}
                      {formatDistanceToNow(new Date(Date.now() - (asset.id!.charCodeAt(0) * 10000000)), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}
                        variant="ghost" 
                        size="sm" 
                        className="text-teal-700 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </Button>
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