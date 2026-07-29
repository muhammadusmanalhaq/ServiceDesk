"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { AlertCircle, Loader2, Monitor } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isColdStart, setIsColdStart] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setError("Session expired, please log in again.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setIsColdStart(false);

    const coldStartTimer = setTimeout(() => {
      setIsColdStart(true);
    }, 5000);

    try {
      const res = await apiFetch.POST("/api/auth/login", {
        body: { email, password },
      });

      if (res.error) {
        setError(res.error.title || "Invalid login credentials.");
      } else if (res.data) {
        login(res.data);
        router.push("/");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Is the API running?");
    } finally {
      clearTimeout(coldStartTimer);
      setIsSubmitting(false);
      setIsColdStart(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl rounded-2xl transition-colors">
      <div className="flex flex-col items-center justify-center space-y-3 mb-8">
        <div className="p-3 bg-teal-100 dark:bg-teal-500/20 rounded-full border border-teal-200 dark:border-teal-500/30">
          <Monitor className="w-8 h-8 text-teal-700 dark:text-teal-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-center text-zinc-900 dark:text-white">
          ServiceDesk
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center text-sm">
          Enter your credentials to access your workspace
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-500 p-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="alice@test.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white rounded-lg h-11 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isColdStart ? "Waking up cloud services (this may take up to 30s)..." : "Authenticating..."}</>
            ) : (
              "Sign In"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center w-full bg-zinc-100 dark:bg-zinc-950 p-4 transition-colors">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}