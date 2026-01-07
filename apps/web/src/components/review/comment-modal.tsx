"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface CommentModalProps {
  isOpen: boolean;
  lineSelection: BlockSelection | null;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}

export function CommentModal({
  isOpen,
  lineSelection,
  onClose,
  onSubmit,
}: CommentModalProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  const handleSubmit = async () => {
    if (!body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody("");
      setActiveTab("write");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setBody("");
    setActiveTab("write");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Add comment</span>
            {lineSelection && (
              <span className="text-sm font-normal text-muted-foreground">
                {lineSelection.startLine === lineSelection.endLine
                  ? `Line ${lineSelection.startLine}`
                  : `Lines ${lineSelection.startLine}-${lineSelection.endLine}`}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {lineSelection && (
          <div className="px-3 py-2 bg-muted/50 rounded-md border text-sm">
            <code className="text-xs text-muted-foreground">
              {lineSelection.blockContent.slice(0, 100)}
              {lineSelection.blockContent.length > 100 && "..."}
            </code>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-3">
            <div className="flex items-center gap-1 border-b pb-2">
              <ToolbarButton icon={Bold} title="Bold" />
              <ToolbarButton icon={Italic} title="Italic" />
              <ToolbarButton icon={Heading} title="Heading" />
              <div className="w-px h-4 bg-border mx-1" />
              <ToolbarButton icon={Code} title="Code" />
              <ToolbarButton icon={Link} title="Link" />
              <div className="w-px h-4 bg-border mx-1" />
              <ToolbarButton icon={List} title="Bullet list" />
              <ToolbarButton icon={ListOrdered} title="Numbered list" />
              <ToolbarButton icon={Quote} title="Quote" />
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave a comment..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </TabsContent>

          <TabsContent value="preview">
            <div className="min-h-[160px] p-3 border rounded-md bg-background">
              {body.trim() ? (
                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {body}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nothing to preview
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !body.trim()}
          >
            {isSubmitting ? "Commenting..." : "Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => e.preventDefault()}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
