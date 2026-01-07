"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReviewHeaderProps {
  title: string | null;
  status: string;
  decisionMessage: string | null;
}

const statusConfig = {
  pending: { label: "Pending Review", variant: "secondary" as const },
  approved: { label: "Approved", variant: "default" as const },
  changes_requested: {
    label: "Changes Requested",
    variant: "outline" as const,
  },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

export function ReviewHeader({
  title,
  status,
  decisionMessage,
}: ReviewHeaderProps) {
  const config =
    statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <div className="border-b pb-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title || "Untitled Review"}</h1>
          {decisionMessage && (
            <p className="text-sm text-muted-foreground mt-1">
              {decisionMessage}
            </p>
          )}
        </div>
        <Badge
          variant={config.variant}
          className={cn(
            status === "approved" && "bg-green-600 hover:bg-green-700",
          )}
        >
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
