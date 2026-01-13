"use client";

interface ReviewHeaderProps {
  title: string | null;
}

export function ReviewHeader({ title }: ReviewHeaderProps) {
  return (
    <div className="border-b pb-4 mb-6">
      <h1 className="text-2xl font-bold">{title || "Untitled Review"}</h1>
    </div>
  );
}
