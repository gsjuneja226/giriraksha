'use client';

import { useState } from 'react';
import { X, Bell, Loader2, CheckCircle, Mail } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

export default function SubscribeAlertModal({
  isOpen,
  onClose,
  lat,
  lon,
  locationName
}: {
  isOpen: boolean;
  onClose: () => void;
  lat: number | null;
  lon: number | null;
  locationName?: string;
}) {
  const [email, setEmail] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [threshold, setThreshold] = useState(70);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!lat || !lon || !email.trim()) return;

    setSubmitting(true);
    try {
      await axios.post('/api/alerts/subscribe', {
        email: email.trim(),
        lat,
        lon,
        radius_km: radiusKm,
        threshold,
        location_name: locationName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setEmail('');
        onClose();
      }, 2000);
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.response?.data?.error || 'Failed to subscribe. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-emerald-900/20">
          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Subscribe to Alerts
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-emerald-400">Subscribed!</p>
            <p className="text-sm text-slate-400">You will receive email alerts when risk exceeds your threshold.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Location */}
            <div className="text-xs text-slate-400 bg-slate-800 rounded px-3 py-2">
              📍 Monitoring: {locationName || `${lat?.toFixed(4)}, ${lon?.toFixed(4)}`}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 px-3 py-2 pl-9 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Alert Radius: <span className="text-emerald-400">{radiusKm} km</span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>

            {/* Threshold */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Risk Threshold: <span className={clsx(
                  threshold > 70 ? 'text-red-400' : threshold > 40 ? 'text-yellow-400' : 'text-green-400'
                )}>{threshold}/100</span>
              </label>
              <input
                type="range"
                min={20}
                max={95}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>20 (Sensitive)</span>
                <span>95 (Critical only)</span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubscribe}
              disabled={submitting || !email.trim()}
              className={clsx(
                'w-full py-2.5 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                email.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Subscribing...</>
              ) : (
                'Subscribe to Email Alerts'
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Powered by Resend. You&apos;ll receive rich HTML alerts when risk score exceeds your threshold.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
