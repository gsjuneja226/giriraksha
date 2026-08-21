import { NextResponse } from 'next/server';
import { subscribeToAlerts } from '@/lib/supabase';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email(),
  lat: z.number().min(6.7).max(37.6),
  lon: z.number().min(68.7).max(97.25),
  radius_km: z.number().min(1).max(100).default(10),
  threshold: z.number().min(0).max(100).default(70),
  location_name: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid subscription data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await subscribeToAlerts(parsed.data);

    if (typeof result === 'string') {
      // By returning the detailed error here, we can see if it's a Supabase issue
      return NextResponse.json({ error: `Supabase Error: ${result}` }, { status: 500 });
    }

    if (!result) {
      return NextResponse.json({ error: 'Failed to subscribe - unknown error.' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Subscribed! You will receive alerts at ${parsed.data.email} when risk > ${parsed.data.threshold}`,
      subscription: result 
    }, { status: 201 });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
