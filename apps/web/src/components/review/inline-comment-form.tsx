"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BlockSelection } from "@/types";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface InlineCommentFormProps {
  lineSelection: BlockSelection;
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
}

export function InlineCommentForm({
  lineSelection,
  onSubmit,
  onCancel,
}: InlineCommentFormProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  const handleSubmit = async () => {
    if (!body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineLabel =
    lineSelection.startLine === lineSelection.endLine
      ? `Line ${lineSelection.startLine}`
      : `Lines ${lineSelection.startLine}-${lineSelection.endLine}`;

  return (
    <div data-comment-form className="my-2 border rounded-lg bg-background shadow-sm">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-muted/30 rounded-t-lg">
        <span className="text-sm font-medium">Add a comment on {lineLabel}</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-3">
        <TabsList className="h-8 mb-2">
          <TabsTrigger value="write" className="text-xs px-3 py-1">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs px-3 py-1">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-0">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Leave a comment"
            className="min-h-[100px] resize-none border-muted text-gray-900 dark:text-gray-100"
            autoFocus
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="min-h-[100px] p-3 border rounded-md bg-muted/20">
            {body.trim() ? (
              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nothing to preview
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !body.trim()}
        >
          {isSubmitting ? "Commenting..." : "Comment"}
        </Button>
      </div>
    </div>
  );
}
