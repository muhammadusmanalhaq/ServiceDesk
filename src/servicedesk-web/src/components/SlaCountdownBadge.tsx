"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SlaCountdownBadgeProps {
  slaDeadline: string; // ISO date string
  isResolved?: boolean;
}

export function SlaCountdownBadge({ slaDeadline, isResolved }: SlaCountdownBadgeProps) {
  const [isBreached, setIsBreached] = useState<boolean>(false);

  const calculateTimeLeft = () => {
    if (isResolved) return "Resolved";
    
    const deadline = new Date(slaDeadline).getTime();
    const now = new Date().getTime();
    const difference = deadline - now;

    if (difference <= 0) {
      const pastDifference = Math.abs(difference);
      const hours = Math.floor((pastDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((pastDifference % (1000 * 60 * 60)) / (1000 * 60));
      return `-${hours}h ${minutes}m`;
    }

    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const [timeLeft, setTimeLeft] = useState<string>(calculateTimeLeft());

  useEffect(() => {
    if (isResolved) {
      setTimeLeft("Resolved");
      setIsBreached(false);
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(slaDeadline).getTime();
      const now = new Date().getTime();
      const difference = deadline - now;
      
      setIsBreached(difference <= 0);
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer(); // Initial check for breached state
    const timer = setInterval(updateTimer, 60000);

    return () => clearInterval(timer);
  }, [slaDeadline, isResolved]);

  // If we don't have a time left yet (initial render), return a skeleton-like badge
  if (!timeLeft) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        --h --m
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium border transition-colors",
        isResolved
          ? "bg-status-resolved/10 text-status-resolved-text border-status-resolved/20"
          : isBreached
          ? "bg-status-critical/10 text-status-critical-text border-status-critical/20"
          : "bg-status-inprogress/10 text-status-inprogress-text border-status-inprogress/20"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isResolved ? "bg-status-resolved" : isBreached ? "bg-status-critical animate-pulse" : "bg-status-inprogress"
        )}
      />
      {timeLeft}
    </span>
  );
}
