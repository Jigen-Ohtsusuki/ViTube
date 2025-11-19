import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function SearchBar() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();
    const pipElement = useAppStore((state) => state.pipElement);
    const containerRef = useRef(null);

    useEffect(() => { if (query.trim().length < 2) { setSuggestions([]); return; } const t = setTimeout(() => { if(window.api) window.api.getSuggestions(query).then(r => r.success && setSuggestions(r.data)); }, 300); return () => clearTimeout(t); }, [query]);
    useGSAP(() => { if (suggestions.length > 0) gsap.fromTo(".suggestion-item", { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.02, duration: 0.3, ease: "power2.out" }); }, [suggestions]);

    const goSearch = async (q) => { if (document.pictureInPictureElement && pipElement) await document.exitPictureInPicture(); navigate(`/search?q=${encodeURIComponent(q)}`); setSuggestions([]); };

    return (
        <form onSubmit={(e) => { e.preventDefault(); goSearch(query); }} className="w-full max-w-[600px] relative group" ref={containerRef}>
            <div className="flex relative items-center">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg className="h-3 w-3 text-[#b9baa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="EXECUTE SEARCH QUERY..." className="w-full pl-10 pr-4 py-3 bg-[#0a100d] border border-[#b9baa3]/20 rounded text-[#d6d5c9] text-xs font-mono focus:border-[#a22c29] focus:bg-[#b9baa3]/5 outline-none placeholder-[#b9baa3]/30 transition-all" />
            </div>
            {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-[#0a100d] border border-[#b9baa3]/20 rounded-b mt-0 overflow-hidden py-2 z-50 shadow-2xl">
                    {suggestions.map(s => (<li key={s} onMouseDown={() => { setQuery(s); goSearch(s); }} className="suggestion-item px-4 py-2 hover:bg-[#a22c29]/10 hover:text-[#a22c29] cursor-pointer text-xs font-mono text-[#b9baa3] flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-[#a22c29] uppercase">{s}</li>))}
                </ul>
            )}
        </form>
    );
}
export default SearchBar;