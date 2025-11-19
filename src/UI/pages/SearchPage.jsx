import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Section from '../components/Section';
import ShortsSection from '../components/ShortsSection';

function SearchPage() {
    const [searchParams] = useSearchParams();
    const q = searchParams.get('q');
    const [results, setResults] = useState({ videos: [], shorts: [] });
    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        if(q && window.api) {
            window.api.search(q).then(r => {
                if (r.success) {
                    const raw = r.data;

                    const shorts = raw.filter(v => {
                        const title = v.snippet.title.toLowerCase();
                        const desc = v.snippet.description ? v.snippet.description.toLowerCase() : '';
                        return title.includes('shorts') || title.includes('#short') || desc.includes('shorts') || desc.includes('#short');
                    });

                    const videos = raw.filter(v => {
                        const title = v.snippet.title.toLowerCase();
                        const desc = v.snippet.description ? v.snippet.description.toLowerCase() : '';
                        return !title.includes('shorts') && !title.includes('#short') && !desc.includes('shorts');
                    });

                    setResults({ videos, shorts });
                }
            });
        }
    }, [q]);

    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, y: 20, duration: 0.4 }); }, [q]);
    const handlePlay = (id) => navigate(`/watch?v=${id}`);

    return (
        <div ref={containerRef} className="flex flex-col gap-12">
            <h2 className="text-xl font-bold text-[#d6d5c9] font-mono tracking-widest">QUERY: "{q}"</h2>

            <Section title="RESULTS" videos={results.videos} onPlay={handlePlay} />

            {results.shorts.length > 0 && <ShortsSection title="FOUND_SHORTS" items={results.shorts} />}
        </div>
    );
}
export default SearchPage;