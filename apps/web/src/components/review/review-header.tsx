"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ReviewHeaderProps {
  title: string | null;
}

export function ReviewHeader({ title }: ReviewHeaderProps) {
  return (
    <div className="border-b pb-4 mb-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="h-3 w-3" />
        Home
      </Link>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
        Reviewing
      </p>
      <h1 className="text-xl font-semibold text-foreground">
        {title || "Untitled Review"}
      </h1>
    </div>
  );
}
