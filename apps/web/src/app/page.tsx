import { MarkdownUploader } from "@/components/landing/markdown-uploader";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">MDReview</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Collaborative markdown document review with inline commenting
          </p>
          <div className="rounded-lg border bg-card p-8 text-left">
            <MarkdownUploader />
          </div>
        </div>
      </div>
    </main>
  );
}
