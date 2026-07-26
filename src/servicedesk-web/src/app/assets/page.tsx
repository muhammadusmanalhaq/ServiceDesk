"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { components } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EditAssetModal } from "@/components/EditAssetModal";

type AssetResponse = components["schemas"]["AssetResponse"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetResponse | null>(null);

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

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 transition-colors">Assets</h1>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Manage and track company hardware and software.</p>
        </div>
        <div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      <EditAssetModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onAssetUpdated={() => {
          fetchData();
        }}
        asset={selectedAsset}
        departments={departments}
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input 
              placeholder="Search assets..." 
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800">
              <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">ID</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Name</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Department</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Last Updated</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                  </TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-slate-500">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map(asset => (
                  <TableRow key={asset.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {asset.id?.split("-")[0]}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {asset.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {asset.departmentId && departments[asset.departmentId] 
                        ? <Badge variant="outline">{departments[asset.departmentId]}</Badge>
                        : <span className="text-slate-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.status === "Active" ? "default" : "secondary"}
                             className={asset.status === "Active" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                      Today
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={() => setSelectedAsset(asset)}
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
