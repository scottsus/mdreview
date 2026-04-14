import { MarkdownUploader } from "@/components/landing/markdown-uploader";
import { FileText, MessageSquare, Download } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1
              className="font-display text-5xl font-bold tracking-tight mb-3 text-foreground"
            >
              MDReview
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Collaborative markdown review with inline commenting
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                No auth required
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Inline comments
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                Export to YAML / JSON
              </span>
            </div>
          </div>

          {/* Upload Card */}
          <div className="rounded-xl border bg-card shadow-sm p-8">
            <MarkdownUploader />
          </div>
        </div>
      </div>
    </main>
  );
}
