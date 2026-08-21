import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory store for rate limiting (Note: In production Edge, this resets per isolate,
// so a distributed store like Redis/Upstash is recommended).
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 50; // Max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
  // Only apply rate limiting to the risk API
  if (request.nextUrl.pathname.startsWith('/api/risk')) {
    const ip = request.headers.get('x-forwarded-for') || request.ip || '127.0.0.1';
    
    const now = Date.now();
    const userLimit = rateLimitMap.get(ip) ?? { count: 0, lastReset: now };

    // Reset window if passed
    if (now - userLimit.lastReset > WINDOW_MS) {
      userLimit.count = 0;
      userLimit.lastReset = now;
    }

    userLimit.count++;
    rateLimitMap.set(ip, userLimit);

    if (userLimit.count > RATE_LIMIT) {
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests. Rate limit exceeded.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
