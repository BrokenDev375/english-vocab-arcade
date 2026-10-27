import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "english-vocab-arcade",
    timestamp: new Date().toISOString(),
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local-dev",
  });
}
