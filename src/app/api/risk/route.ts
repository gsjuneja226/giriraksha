import { NextResponse } from 'next/server';
import { calculateRisk, getRiskAction } from '@/lib/risk-calculator';
import { apiCache } from '@/lib/cache';
import fallbackData from '@/data/demo_fallback.json';
import axios from 'axios';

// Calculate distance between two lat/lon points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  
  // Round to 3 decimal places for caching (~111m precision)
  const cacheKey = `risk_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    // 1. Calculate surrounding points for slope (approx 100m away in cardinal directions)
    // 1 degree lat ~ 111km, so 100m ~ 0.0009 degrees
    const dLat = 0.0009;
    const dLon = 0.0009 / Math.cos(lat * Math.PI / 180);
    
    const points = [
      { lat, lon }, // Center
      { lat: lat + dLat, lon }, // North
      { lat: lat - dLat, lon }, // South
      { lat, lon: lon + dLon }, // East
      { lat, lon: lon - dLon }  // West
    ];

    const lats = points.map(p => p.lat).join(',');
    const lons = points.map(p => p.lon).join(',');

    const timeoutConfig = { timeout: 3000 };

    // Fetch Elevation
    const elevRes = await axios.get(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`, timeoutConfig);
    const elevations = elevRes.data.elevation;
    
    if (!elevations || elevations.length < 5) {
      throw new Error("Invalid elevation data");
    }

    const centerElev = elevations[0];
    const nElev = elevations[1];
    const sElev = elevations[2];
    const eElev = elevations[3];
    const wElev = elevations[4];

    // Calculate slope (max gradient between opposing points)
    // Distance between N and S is ~200m
    const dz_dy = (nElev - sElev) / 200;
    const dz_dx = (eElev - wElev) / (getDistance(lat, lon - dLon, lat, lon + dLon));
    
    const gradient = Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy);
    const slopeDegrees = Math.atan(gradient) * (180 / Math.PI);

    // Fetch Weather (Rainfall & Soil Moisture)
    const weatherRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,soil_moisture_0_to_1cm&daily=precipitation_sum&past_days=3&forecast_days=1`,
      timeoutConfig
    );
    
    const dailyPrecip = weatherRes.data.daily?.precipitation_sum || [];
    const hourlyMoisture = weatherRes.data.hourly?.soil_moisture_0_to_1cm || [];
    const hourlyPrecip = weatherRes.data.hourly?.precipitation || [];

    // Sum past 3 days and next 1 day
    const totalRainfall = dailyPrecip.reduce((a: number, b: number) => a + (b || 0), 0);
    
    // Get latest soil moisture
    // Find the current hour index or use the last available
    const moisture = hourlyMoisture.filter((m: number) => m !== null).pop() || 0.5;

    const riskScore = calculateRisk(slopeDegrees, totalRainfall, moisture);

    const result = {
      lat,
      lon,
      slope: Math.round(slopeDegrees * 10) / 10,
      rainfall: Math.round(totalRainfall * 10) / 10,
      soilMoisture: Math.round(moisture * 100) / 100,
      riskScore,
      action: getRiskAction(riskScore),
      timestamp: new Date().toISOString()
    };

    apiCache.set(cacheKey, result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("Live API failed, returning fallback if close enough:", error);
    // Find nearest fallback point if within ~10km, otherwise just return first one as dummy (or error)
    // For demo purposes, we will return a default fallback if it fails.
    let nearest = fallbackData[0];
    let minDist = Infinity;
    for (const fb of fallbackData) {
      const d = getDistance(lat, lon, fb.lat, fb.lon);
      if (d < minDist) {
        minDist = d;
        nearest = fb;
      }
    }
    
    return NextResponse.json({
      ...nearest,
      isFallback: true,
      error: "Live APIs unavailable, showing cached/demo data."
    });
  }
}
