import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic = "force-dynamic";

const backendBaseUrl =
  process.env.BACKEND_API_URL ??
  "http://127.0.0.1:8080";

// Match Fiber's body limit before buffering an upload in the web process.
const maxProxyBodyBytes = 18 * 1024 * 1024;

class ProxyBodyTooLarge extends Error {}

async function readProxyBody(request: NextRequest) {
  if (!request.body) return undefined;
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > maxProxyBodyBytes) throw new ProxyBodyTooLarge();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxProxyBodyBytes) {
        await reader.cancel();
        throw new ProxyBodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

async function proxyRequest(
  request: NextRequest
) {
  try {
    const backendPath =
      request.nextUrl.pathname.replace(
        /^\/api/,
        ""
      ) || "/";

    // A protocol-relative path (including WHATWG backslash normalization)
    // must never replace the configured backend or receive user credentials.
    if (
      !backendPath.startsWith("/") ||
      backendPath.startsWith("//") ||
      backendPath.includes("\\")
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid API path." },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const targetUrl = new URL(backendBaseUrl);
    targetUrl.pathname = backendPath;

    targetUrl.search =
      request.nextUrl.search;

    const requestHeaders = new Headers(
      request.headers
    );

    requestHeaders.delete("host");
    requestHeaders.delete("origin");
    requestHeaders.delete("referer");
    requestHeaders.delete(
      "content-length"
    );
    requestHeaders.delete(
      "accept-encoding"
    );

    const hasBody =
      request.method !== "GET" &&
      request.method !== "HEAD";

    const requestBody =
      hasBody && request.body
        ? await readProxyBody(request)
        : undefined;

    const backendResponse = await fetch(
      targetUrl,
      {
        method: request.method,
        headers: requestHeaders,
        body: requestBody,
        redirect: "manual",
        cache: "no-store",
      }
    );

    const responseHeaders = new Headers(
      backendResponse.headers
    );
    responseHeaders.set("Cache-Control", "private, no-store");

    responseHeaders.delete(
      "content-length"
    );
    responseHeaders.delete(
      "content-encoding"
    );
    responseHeaders.delete(
      "transfer-encoding"
    );

    return new NextResponse(
      backendResponse.body,
      {
        status: backendResponse.status,
        headers: responseHeaders,
      }
    );
  } catch (error: unknown) {
    if (error instanceof ProxyBodyTooLarge) {
      return NextResponse.json(
        { success: false, message: "Request body is too large." },
        { status: 413, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    // Fetch errors can contain URLs with verification/reset query tokens.
    console.error("API proxy request failed");

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to connect to the backend server.",
      },
      {
        status: 502,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
