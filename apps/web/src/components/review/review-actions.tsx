"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ReviewActionsProps {
  onExport: (format: "yaml" | "json") => void;
}

export function ReviewActions({ onExport }: ReviewActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport("yaml")}>
            <Download className="h-4 w-4 mr-1" />
            Export YAML
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("json")}>
            <Download className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
