"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ReviewActionsProps {
  onExport: (format: "yaml" | "json") => void;
}

export function ReviewActions({ onExport }: ReviewActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm shadow-[0_-1px_6px_rgba(0,0,0,0.06)] px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Export your review
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport("yaml")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            YAML
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("json")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
