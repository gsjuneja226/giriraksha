'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const HAZARD_TYPES = [
  { value: 'road_crack', label: '🛣️ Road Cracks', emoji: '🛣️' },
  { value: 'rockfall', label: '🪨 Rockfall / Debris', emoji: '🪨' },
  { value: 'water_spring', label: '💧 New Water Spring', emoji: '💧' },
  { value: 'deforestation', label: '🌲 Deforestation', emoji: '🌲' },
  { value: 'other', label: '⚠️ Other Hazard', emoji: '⚠️' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-600' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-600' },
  { value: 'high', label: 'High', color: 'bg-red-600' },
];

export default function ReportHazardModal({
  isOpen,
  onClose,
  lat,
  lon,
  onReportSubmitted
}: {
  isOpen: boolean;
  onClose: () => void;
  lat: number | null;
  lon: number | null;
  onReportSubmitted?: (report: any) => void;
}) {
  const [type, setType] = useState('road_crack');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!lat || !lon || !description.trim()) return;

    setSubmitting(true);
    try {
      const res = await axios.post('/api/reports', {
        lat,
        lon,
        type,
        description: description.trim(),
        severity
      });

      setSubmitted(true);
      onReportSubmitted?.(res.data);

      setTimeout(() => {
        setSubmitted(false);
        setDescription('');
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-amber-900/20">
          <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Report Hazard
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-lg font-semibold text-green-400">Report Submitted!</p>
            <p className="text-sm text-slate-400">Thank you for helping keep our roads safe.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Location */}
            <div className="text-xs text-slate-400 bg-slate-800 rounded px-3 py-2">
              📍 Location: {lat?.toFixed(4)}, {lon?.toFixed(4)}
            </div>

            {/* Hazard Type */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Hazard Type</label>
              <div className="grid grid-cols-2 gap-2">
                {HAZARD_TYPES.map(h => (
                  <button
                    key={h.value}
                    onClick={() => setType(h.value)}
                    className={clsx(
                      'px-3 py-2 rounded text-xs font-medium border transition-all text-left',
                      type === h.value
                        ? 'bg-amber-900/40 border-amber-600 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Severity</label>
              <div className="flex gap-2">
                {SEVERITY_LEVELS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSeverity(s.value)}
                    className={clsx(
                      'flex-1 px-3 py-2 rounded text-xs font-semibold border transition-all',
                      severity === s.value
                        ? `${s.color} border-transparent text-white`
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you observed (e.g., 'Large crack across road near hairpin bend #7')"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
              className={clsx(
                'w-full py-2.5 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                description.trim()
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
