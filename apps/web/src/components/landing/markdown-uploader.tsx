"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function MarkdownUploader() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text);
        if (!title) {
          setTitle(file.name.replace(/\.md$/, ""));
        }
      };
      reader.readAsText(file);
    },
    [title],
  );

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Please enter some markdown content");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim() || undefined,
          source: "manual",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create review");
      }

      const data = await response.json();
      router.push(`/review/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
          Title <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Document Review"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1.5">
          Markdown Content
        </label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your markdown content here..."
          className="min-h-[200px] font-mono text-sm"
        />
        {content && (
          <p className="text-xs text-muted-foreground text-right mt-1">
            {content.split("\n").length} lines · {content.length} characters
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 group-hover:border-border group-hover:bg-accent transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload .md file</span>
          </div>
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          size="lg"
          className="px-8"
        >
          {isSubmitting ? "Creating…" : "Create Review"}
        </Button>
      </div>
    </div>
  );
}
