import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function SearchBar({ onLocationSelect }: { onLocationSelect: (lat: number, lon: number, name: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        searchNominatim(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchNominatim = async (q: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
      setOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    onLocationSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name.split(',')[0]);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-md z-[1000]">
      <div className="relative">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search locations in India..."
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 pl-10 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-lg"
        />
        <div className="absolute left-3 top-2.5 text-slate-400">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </div>
      </div>
      
      {open && results.length > 0 && (
        <div className="absolute mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <div 
              key={i} 
              onClick={() => handleSelect(r)}
              className="px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-300 border-b border-slate-700/50 last:border-0"
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
