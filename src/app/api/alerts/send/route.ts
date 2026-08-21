import { NextResponse } from 'next/server';
import { getSubscriptionsNearPoint } from '@/lib/supabase';

// Resend is used for sending actual emails.
// Set RESEND_API_KEY in .env.local to enable real email delivery.
// Without it, the endpoint logs the alert and returns a mock success.

export async function POST(request: Request) {
  try {
    const { lat, lon, riskScore, locationName } = await request.json();

    if (!lat || !lon || riskScore === undefined) {
      return NextResponse.json({ error: 'lat, lon, and riskScore are required' }, { status: 400 });
    }

    // Find all subscribers near this point whose threshold has been exceeded
    const subscribers = await getSubscriptionsNearPoint(lat, lon);
    const triggered = subscribers.filter(sub => riskScore >= sub.threshold);

    if (triggered.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscribers exceed threshold' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Real email delivery via Resend
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey);

      const results = await Promise.allSettled(
        triggered.map(sub =>
          resend.emails.send({
            from: 'GiriRaksha Alerts <alerts@giriraksha.app>',
            to: sub.email,
            subject: `🚨 GiriRaksha Alert: High Landslide Risk (${riskScore}/100)`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0;">🚨 Landslide Risk Alert</h1>
                  <p style="margin: 8px 0 0 0; opacity: 0.9;">GiriRaksha Early Warning System</p>
                </div>
                <div style="background: #1e293b; color: #e2e8f0; padding: 24px; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #f87171; margin-top: 0;">Risk Score: ${riskScore}/100</h2>
                  <p><strong>Location:</strong> ${locationName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}</p>
                  <p><strong>Your Alert Threshold:</strong> ${sub.threshold}/100</p>
                  <p style="margin-top: 16px; padding: 12px; background: #991b1b33; border: 1px solid #991b1b; border-radius: 8px;">
                    ⚠️ <strong>Action Required:</strong> Avoid travel on this route. Contact local authorities for road status updates.
                  </p>
                  <hr style="border-color: #334155; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #94a3b8;">
                    You are receiving this because you subscribed to GiriRaksha alerts for this area.
                    This is an automated warning based on terrain, weather, and geological data analysis.
                  </p>
                </div>
              </div>
            `
          })
        )
      );

      const sent = results.filter(r => r.status === 'fulfilled').length;
      return NextResponse.json({ sent, total: triggered.length });
    } else {
      // Mock mode: log to console
      console.log(`[MOCK EMAIL] Would send alert to ${triggered.length} subscribers:`);
      triggered.forEach(sub => {
        console.log(`  → ${sub.email} (threshold: ${sub.threshold}, risk: ${riskScore})`);
      });

      return NextResponse.json({
        sent: triggered.length,
        mock: true,
        message: `RESEND_API_KEY not set. ${triggered.length} alert(s) logged to console.`
      });
    }
  } catch (error) {
    console.error('Alert sending error:', error);
    return NextResponse.json({ error: 'Failed to send alerts' }, { status: 500 });
  }
}
