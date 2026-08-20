import { NextResponse } from 'next/server';
import axios from 'axios';
import { apiCache } from '@/lib/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  
  const cacheKey = `road_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // Query Overpass API for nearest road within 1000m
    const query = `
      [out:json];
      way(around:1000, ${lat}, ${lon})["highway"];
      out geom 1;
    `;
    
    const res = await axios.get(`https://overpass-api.de/api/interpreter`, {
      params: { data: query },
      timeout: 3000
    });

    if (res.data && res.data.elements && res.data.elements.length > 0) {
      // Find the center of the first way's geometry
      const bounds = res.data.elements[0].bounds;
      const roadLat = (bounds.minlat + bounds.maxlat) / 2;
      const roadLon = (bounds.minlon + bounds.maxlon) / 2;
      
      const result = { roadLat, roadLon, found: true };
      apiCache.set(cacheKey, result);
      return NextResponse.json(result);
    }

    const result = { roadLat: lat, roadLon: lon, found: false };
    apiCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Overpass API failed", error);
    // Fallback to original point
    return NextResponse.json({ roadLat: lat, roadLon: lon, found: false, error: true });
  }
}
