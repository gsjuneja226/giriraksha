import { NextResponse } from 'next/server';
import axios from 'axios';
import { apiCache } from '@/lib/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  const cacheKey = `search_${q.toLowerCase()}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: `${q}, India`,
        format: 'json',
        limit: 5,
      },
      headers: {
        'User-Agent': 'GiriRaksha-Hackathon-App/1.0 (contact@example.com)'
      },
      timeout: 3000
    });

    apiCache.set(cacheKey, res.data);
    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Nominatim API failed", error);
    return NextResponse.json([], { status: 500 });
  }
}
