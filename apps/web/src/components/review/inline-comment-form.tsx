"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BlockSelection } from "@/types";
import {
  Bold,
  Code,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
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
        <div className="flex items-center justify-between mb-2">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs px-3 py-1">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3 py-1">
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton icon={Heading} title="Heading" />
            <ToolbarButton icon={Bold} title="Bold" />
            <ToolbarButton icon={Italic} title="Italic" />
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton icon={Code} title="Code" />
            <ToolbarButton icon={Link} title="Link" />
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton icon={List} title="Bullet list" />
            <ToolbarButton icon={ListOrdered} title="Numbered list" />
            <ToolbarButton icon={Quote} title="Quote" />
          </div>
        </div>

        <TabsContent value="write" className="mt-0">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment"
            className="min-h-[100px] resize-none border-muted"
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

function ToolbarButton({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => e.preventDefault()}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
