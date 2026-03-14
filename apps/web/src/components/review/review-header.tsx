"use client";

interface ReviewHeaderProps {
  title: string | null;
}

export function ReviewHeader({ title }: ReviewHeaderProps) {
  return (
    <div className="border-b pb-4 mb-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
        Reviewing
      </p>
      <h1 className="text-xl font-semibold text-foreground">
        {title || "Untitled Review"}
      </h1>
    </div>
  );
}
