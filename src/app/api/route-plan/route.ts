import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';

const routeSchema = z.object({
  startLat: z.number().min(6.7).max(37.6),
  startLon: z.number().min(68.7).max(97.25),
  endLat: z.number().min(6.7).max(37.6),
  endLon: z.number().min(68.7).max(97.25)
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = routeSchema.safeParse({
    startLat: parseFloat(searchParams.get('startLat') || ''),
    startLon: parseFloat(searchParams.get('startLon') || ''),
    endLat: parseFloat(searchParams.get('endLat') || ''),
    endLon: parseFloat(searchParams.get('endLon') || '')
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid route coordinates. Must be within India bounds.' },
      { status: 400 }
    );
  }

  const { startLat, startLon, endLat, endLon } = parsed.data;

  try {
    // Query OSRM public API for driving directions
    const osrmRes = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`,
      { timeout: 5000 }
    );

    if (!osrmRes.data.routes || osrmRes.data.routes.length === 0) {
      return NextResponse.json({ error: 'No route found between these points' }, { status: 404 });
    }

    const route = osrmRes.data.routes[0];
    const coordinates = route.geometry.coordinates; // Array of [lon, lat]

    // Sample points along the route every ~2km for risk analysis
    const samplePoints: { lat: number; lon: number; distanceKm: number }[] = [];
    let accumulatedDistance = 0;
    const SAMPLE_INTERVAL_KM = 2;

    for (let i = 0; i < coordinates.length; i++) {
      if (i > 0) {
        const [lon1, lat1] = coordinates[i - 1];
        const [lon2, lat2] = coordinates[i];
        accumulatedDistance += haversineDistance(lat1, lon1, lat2, lon2);
      }

      if (i === 0 || accumulatedDistance >= SAMPLE_INTERVAL_KM * samplePoints.length) {
        samplePoints.push({
          lat: coordinates[i][1],
          lon: coordinates[i][0],
          distanceKm: Math.round(accumulatedDistance * 10) / 10
        });
      }
    }

    // Always include the destination
    const lastCoord = coordinates[coordinates.length - 1];
    if (samplePoints[samplePoints.length - 1].lat !== lastCoord[1]) {
      samplePoints.push({
        lat: lastCoord[1],
        lon: lastCoord[0],
        distanceKm: Math.round(accumulatedDistance * 10) / 10
      });
    }

    return NextResponse.json({
      route: {
        coordinates: coordinates.map(([lon, lat]: [number, number]) => ({ lat, lon })),
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round((route.duration / 60) * 10) / 10,
        summary: route.legs?.[0]?.summary || 'Route'
      },
      samplePoints,
      totalSamples: samplePoints.length
    });
  } catch (error: any) {
    console.error('OSRM routing error:', error.message);
    return NextResponse.json(
      { error: 'Routing service unavailable. Please try again.' },
      { status: 503 }
    );
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
