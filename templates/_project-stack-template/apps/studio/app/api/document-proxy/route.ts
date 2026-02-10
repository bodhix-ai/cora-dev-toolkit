import { NextRequest, NextResponse } from "next/server";

/**
 * Document Proxy API Route
 *
 * Proxies S3 presigned URLs through the Next.js server to:
 * 1. Bypass CORS restrictions (S3 may not allow localhost:3001)
 * 2. Override Content-Disposition from "attachment" to "inline" (display, don't download)
 *
 * Usage: GET /api/document-proxy?url=<encoded-presigned-url>
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch document: ${response.status}` },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const contentType = response.headers.get("Content-Type") || "application/octet-stream";

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline", // Force inline display (not download)
        "Cache-Control": "private, max-age=300", // Cache for 5 min (presigned URLs expire)
      },
    });
  } catch (err) {
    console.error("Document proxy error:", err);
    return NextResponse.json(
      { error: "Failed to proxy document" },
      { status: 500 }
    );
  }
}