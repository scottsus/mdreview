"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { reviewApi } from "@/lib/api-service";
import { AlertCircle, Check, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ReviewActionsProps {
  reviewId: string;
  status: string;
  onStatusChange: (status: string, message: string | null) => void;
  onExport: (format: "yaml" | "json") => void;
}

type ActionType = "approved" | "changes_requested" | null;

export function ReviewActions({
  reviewId,
  status,
  onStatusChange,
  onExport,
}: ReviewActionsProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    try {
      const result = await reviewApi.submitDecision(
        reviewId,
        selectedAction,
        message.trim() || undefined,
      );
      onStatusChange(result.status, result.decisionMessage);
      setSelectedAction(null);
      setMessage("");
    } catch (error) {
      toast.error("Failed to submit review decision");
      console.error("Submit decision error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = status === "pending";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport("yaml")}
            >
              <Download className="h-4 w-4 mr-1" />
              Export YAML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport("json")}
            >
              <Download className="h-4 w-4 mr-1" />
              Export JSON
            </Button>
          </div>

          {isPending && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAction("changes_requested")}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedAction("approved")}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="text-sm text-muted-foreground">
              Review {status.replace("_", " ")}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!selectedAction}
        onOpenChange={() => setSelectedAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === "approved" && "Approve Review"}
              {selectedAction === "changes_requested" && "Request Changes"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">Message (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Add a message for the author..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
