import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000';

function buildBackendUrl(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const base = BACKEND.replace(/\/$/, '');
  return `${base}${pathname}${search}`;
}

async function proxy(request: NextRequest) {
  const url = buildBackendUrl(request);
  const authHeader = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');

  const headers: HeadersInit = {
    ...(authHeader && { Authorization: authHeader }),
    ...(contentType && { 'Content-Type': contentType }),
  };

  try {
    const body = request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined;
    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
    const data = await res.text();
    const responseHeaders = new Headers();
    const contentTypeRes = res.headers.get('content-type');
    if (contentTypeRes) responseHeaders.set('Content-Type', contentTypeRes);
    return new NextResponse(data, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error('Scheduling API proxy error:', e);
    return NextResponse.json(
      { detail: 'Scheduling service unavailable' },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
