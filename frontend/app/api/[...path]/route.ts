import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic = "force-dynamic";

const backendBaseUrl =
  process.env.BACKEND_API_URL ??
  "http://127.0.0.1:8080";

async function proxyRequest(
  request: NextRequest
) {
  try {
    const backendPath =
      request.nextUrl.pathname.replace(
        /^\/api/,
        ""
      );

    const targetUrl = new URL(
      backendPath || "/",
      backendBaseUrl
    );

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
        ? await request.arrayBuffer()
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
    console.error(
      "API proxy error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to connect to the backend server.",
      },
      {
        status: 502,
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