import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Section from '../components/Section';
import ShortsSection from '../components/ShortsSection';

function HomePage() {
    const { playVideo } = useAppStore();
    const navigate = useNavigate();
    const [data, setData] = useState({ history: [], recs: [], trending: [], shorts: [] });
    const [status, setStatus] = useState('FETCHING DATA...');
    const containerRef = useRef(null);

    useEffect(() => {
        if(!window.api) return;
        const load = async () => {
            try {
                const hist = await window.api.getHistory();
                const trend = await window.api.getTrending();
                let recs = { success: false };

                if (hist.success && hist.data.length > 0) {
                    const lastCat = hist.data.find(v => v.categoryId);
                    if (lastCat) recs = await window.api.getTrendingByCategory(lastCat.categoryId);
                }

                const rawTrending = trend.success ? trend.data : [];

                const shorts = rawTrending.filter(v => {
                    const title = v.snippet.title.toLowerCase();
                    const desc = v.snippet.description ? v.snippet.description.toLowerCase() : '';
                    return title.includes('shorts') || title.includes('#short') || desc.includes('shorts') || desc.includes('#short');
                });

                const videos = rawTrending.filter(v => {
                    const title = v.snippet.title.toLowerCase();
                    const desc = v.snippet.description ? v.snippet.description.toLowerCase() : '';
                    return !title.includes('shorts') && !title.includes('#short') && !desc.includes('shorts');
                });

                setData({
                    history: hist.success ? hist.data : [],
                    trending: videos,
                    shorts: shorts,
                    recs: recs.success ? recs.data : []
                });
                setStatus('');
            } catch(e) {
                setStatus(e.message);
            }
        };
        load();
    }, []);

    const handlePlay = (id) => navigate(`/watch?v=${id}`);

    useGSAP(() => {
        if (data.trending.length > 0) {
            gsap.from(".animate-section", {
                opacity: 0,
                y: 20,
                stagger: 0.05,
                duration: 0.4,
                ease: "power2.out",
                clearProps: "all"
            });
        }
    }, [data.trending]);

    return (
        <div ref={containerRef} className="flex flex-col gap-16">
            {status && <p className="text-[#b9baa3]/40 text-center mt-20 font-mono text-xs animate-pulse tracking-widest">{status}</p>}

            {data.trending.length > 0 && <div className="animate-section"><Section title="TRENDING_VIDEOS" videos={data.trending} onPlay={handlePlay} /></div>}

            {data.shorts.length > 0 && <div className="animate-section"><ShortsSection title="TRENDING_SHORTS" items={data.shorts} /></div>}

            {data.recs.length > 0 && <div className="animate-section"><Section title="RECOMMENDED" videos={data.recs} onPlay={handlePlay} /></div>}

            {data.history.length > 0 && (
                <section className="animate-section">
                    <h2 className="text-xl font-bold mb-6 text-[#d6d5c9] font-mono tracking-widest flex items-center gap-4"><span className="w-8 h-px bg-[#a22c29]"></span>RECENT_LOGS</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {data.history.map(v => (
                            <div key={v.id} onClick={() => handlePlay(v.videoId)} className="cursor-pointer bg-[#b9baa3]/5 p-4 rounded border border-[#b9baa3]/10 hover:border-[#a22c29]/50 hover:bg-[#b9baa3]/10 transition-all group">
                                <p className="font-bold truncate text-[#d6d5c9] group-hover:text-[#a22c29] transition-colors font-mono text-xs uppercase">{v.title}</p>
                                <p className="text-[10px] text-[#b9baa3]/50 mt-2 font-mono uppercase tracking-wider">{v.channel}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
export default HomePage;