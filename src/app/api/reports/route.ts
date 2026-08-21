import { NextResponse } from 'next/server';
import { submitHazardReport, getHazardReports } from '@/lib/supabase';
import { z } from 'zod';

const reportSchema = z.object({
  lat: z.number().min(6.7).max(37.6),
  lon: z.number().min(68.7).max(97.25),
  type: z.enum(['road_crack', 'rockfall', 'water_spring', 'deforestation', 'other']),
  description: z.string().min(3).max(500),
  severity: z.enum(['low', 'medium', 'high']),
  reported_by: z.string().optional()
});

// POST - Submit a new hazard report
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid report data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await submitHazardReport(parsed.data);

    if (!result) {
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Fetch hazard reports near a point
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radius = parseFloat(searchParams.get('radius') || '50');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const reports = await getHazardReports(lat, lon, radius);
  return NextResponse.json(reports);
}
