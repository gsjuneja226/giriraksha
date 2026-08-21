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
    // Photon is a much more reliable, free geocoding API than Nominatim (no strict User-Agent blocks)
    const res = await axios.get(`https://photon.komoot.io/api/`, {
      params: {
        q: q,
        limit: 5,
        lat: 22.0, // bias towards India
        lon: 79.0,
      },
      timeout: 5000
    });

    // Map Photon GeoJSON format to the format our UI expects (Nominatim format)
    const formattedResults = res.data.features.map((f: any) => ({
      display_name: [f.properties.name, f.properties.state, f.properties.country].filter(Boolean).join(', '),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }));

    apiCache.set(cacheKey, formattedResults);
    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("Photon API failed, returning empty results.", error);
    return NextResponse.json([]);
  }
}
