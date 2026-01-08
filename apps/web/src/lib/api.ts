import { NextResponse } from "next/server";
import { ZodError, ZodIssue } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  error: string,
  message: string,
  status: number,
  issues?: ZodIssue[],
) {
  return NextResponse.json({ error, message, issues }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse(
      "validation_error",
      "Invalid request data",
      400,
      error.errors,
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return errorResponse("internal_server_error", message, 500);
}
