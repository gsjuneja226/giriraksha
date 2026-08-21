import { NextResponse } from 'next/server';
import { calculateRisk, getRiskAction } from '@/lib/risk-calculator';
import { apiCache } from '@/lib/cache';
import fallbackData from '@/data/demo_fallback.json';
import axios from 'axios';
import { z } from 'zod';

const coordinateSchema = z.object({
  lat: z.number().min(6.7).max(37.6), // Rough bounds of India
  lon: z.number().min(68.7).max(97.25)
});

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
  
  const parsed = coordinateSchema.safeParse({
    lat: parseFloat(searchParams.get('lat') || ''),
    lon: parseFloat(searchParams.get('lon') || '')
  });

  if (!parsed.success) {
    return NextResponse.json({ 
      error: 'Invalid coordinates. Must be within India bounds.' 
    }, { status: 400 });
  }

  const { lat, lon } = parsed.data;
  
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
    const moisture = hourlyMoisture.filter((m: number) => m !== null).pop() || 0.5;

    // POST to ML Engine instead of calculating locally
    const mlResponse = await axios.post('http://localhost:8000/predict', {
      lat,
      lon,
      rainfall_72h: totalRainfall,
      soil_moisture: moisture
    }, timeoutConfig).catch(e => {
      console.warn("ML Engine not reachable, falling back to local heuristic.", e.message);
      return null;
    });

    let riskScore;
    let mlData = {};

    if (mlResponse && mlResponse.data) {
      riskScore = mlResponse.data.probability_of_failure;
      mlData = {
        geology: mlResponse.data.geology,
        terrain: mlResponse.data.terrain,
        vegetation: mlResponse.data.vegetation
      };
    } else {
      // Fallback heuristic if Python server isn't running
      riskScore = calculateRisk(slopeDegrees, totalRainfall, moisture);
    }

    let isWaterBody = false;
    if (centerElev <= 0 && slopeDegrees < 2) {
      isWaterBody = true;
    }

    const result = {
      lat,
      lon,
      slope: Math.round(slopeDegrees * 10) / 10,
      rainfall: Math.round(totalRainfall * 10) / 10,
      soilMoisture: Math.round(moisture * 100) / 100,
      riskScore,
      action: isWaterBody ? (riskScore > 50 ? "TSUNAMI/FLOOD WARNING" : "Safe Waterbody") : getRiskAction(riskScore),
      riskType: isWaterBody ? "Flood/Tsunami" : "Landslide",
      ...mlData,
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
