import { createClient } from '@supabase/supabase-js';

// These can be set to empty strings for local development without Supabase.
// The app gracefully falls back to local-only mode when Supabase is unavailable.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ---------- Type Definitions ----------

export interface HazardReport {
  id?: string;
  lat: number;
  lon: number;
  type: 'road_crack' | 'rockfall' | 'water_spring' | 'deforestation' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  reported_by?: string;
  created_at?: string;
}

export interface AlertSubscription {
  id?: string;
  email: string;
  lat: number;
  lon: number;
  radius_km: number;
  threshold: number; // risk score threshold to trigger alert
  location_name?: string;
  created_at?: string;
}

// ---------- Hazard Reports ----------

export async function submitHazardReport(report: HazardReport): Promise<HazardReport | null> {
  if (!supabase) {
    // Fallback: store locally in memory (for demo without Supabase)
    console.warn('Supabase not configured. Report stored locally only.');
    return { ...report, id: `local-${Date.now()}`, created_at: new Date().toISOString() };
  }

  const { data, error } = await supabase
    .from('hazard_reports')
    .insert([report])
    .select()
    .single();

  if (error) {
    console.error('Error submitting report:', error);
    return null;
  }
  return data;
}

export async function getHazardReports(lat: number, lon: number, radiusKm: number = 50): Promise<HazardReport[]> {
  if (!supabase) {
    return []; // No reports available without Supabase
  }

  // Approximate bounding box (1 degree lat ≈ 111km)
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const { data, error } = await supabase
    .from('hazard_reports')
    .select('*')
    .gte('lat', lat - dLat)
    .lte('lat', lat + dLat)
    .gte('lon', lon - dLon)
    .lte('lon', lon + dLon)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data || [];
}

// ---------- Alert Subscriptions ----------

export async function subscribeToAlerts(sub: AlertSubscription): Promise<AlertSubscription | string> {
  if (!supabase) {
    console.warn('Supabase not configured. Subscription stored locally only.');
    return { ...sub, id: `local-${Date.now()}`, created_at: new Date().toISOString() };
  }

  const { error } = await supabase
    .from('alert_subscriptions')
    .insert([sub]);

  if (error) {
    console.error('Error subscribing:', error);
    return error.message; // Return the exact Supabase error string
  }
  return sub;
}

export async function getSubscriptionsNearPoint(lat: number, lon: number): Promise<AlertSubscription[]> {
  if (!supabase) return [];

  // Fetch all subscriptions and filter by radius on server
  const { data, error } = await supabase
    .from('alert_subscriptions')
    .select('*');

  if (error || !data) return [];

  // Filter by haversine distance
  return data.filter(sub => {
    const R = 6371;
    const dLat = (sub.lat - lat) * Math.PI / 180;
    const dLon = (sub.lon - lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * Math.PI / 180) * Math.cos(sub.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= sub.radius_km;
  });
}
