import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Section from '../components/Section';
import ShortsSection from '../components/ShortsSection';
import PlaylistGrid from '../components/PlaylistGrid';

function ChannelPage() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const title = searchParams.get('title');

    const [activeTab, setActiveTab] = useState('videos');
    const [videos, setVideos] = useState([]);
    const [shorts, setShorts] = useState([]);
    const [streams, setStreams] = useState([]);
    const [playlists, setPlaylists] = useState([]);

    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [channelIcon, setChannelIcon] = useState(null);
    const [channelBanner, setChannelBanner] = useState(null);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isModifyingSub, setIsModifyingSub] = useState(false);

    const navigate = useNavigate();
    const containerRef = useRef(null);

    const checkStatus = async (channelId) => {
        if (!window.api.checkSubscription) return;
        const res = await window.api.checkSubscription(channelId);
        if (res.success) {
            setIsSubscribed(res.data.isSubscribed);
        }
    };

    const handleSubscribe = async () => {
        if (!id || !window.api.modifySubscription || isModifyingSub) return;

        setIsModifyingSub(true);
        const action = isSubscribed ? 'unsubscribe' : 'subscribe';

        try {
            const res = await window.api.modifySubscription(id, action);
            if (res.success) {
                setIsSubscribed(!isSubscribed);
            } else {
                alert(`Error: ${res.error}`);
            }
        } catch(e) {
            alert(`Error processing request: ${e.message}`);
        } finally {
            setIsModifyingSub(false);
        }
    };


    useEffect(() => {
        if (!id || !window.api) return;

        // 1. Fetch Info & Check Status
        window.api.getChannelIcon(id).then(r => {
            if (r.success && typeof r.data === 'object' && r.data !== null) {
                // Handles the structured object response
                r.data.icon && setChannelIcon(r.data.icon);
                r.data.banner && setChannelBanner(r.data.banner);
            } else if (r.success && typeof r.data === 'string') {
                // Fallback for old simple string response
                setChannelIcon(r.data);
            }
        });

        checkStatus(id);

        const loadContent = async (tab) => {
            setIsLoading(true);
            setStatus(`ACCESSING ${tab.toUpperCase()}...`);
            try {
                if (tab === 'videos') {
                    const result = await window.api.getChannelContent(id, 'video');
                    if (result.success) {
                        const s = result.data.filter(v => {
                            const t = v.snippet.title.toLowerCase();
                            const d = v.snippet.description ? v.snippet.description.toLowerCase() : '';
                            return t.includes('shorts') || t.includes('#short') || d.includes('shorts');
                        });
                        const v = result.data.filter(v => {
                            const t = v.snippet.title.toLowerCase();
                            const d = v.snippet.description ? v.snippet.description.toLowerCase() : '';
                            return !t.includes('shorts') && !t.includes('#short') && !d.includes('shorts');
                        });
                        setShorts(s);
                        setVideos(v);
                    } else setStatus(result.error);
                } else if (tab === 'live') {
                    const result = await window.api.getChannelContent(id, 'live');
                    if (result.success) setStreams(result.data); else setStatus(result.error);
                } else if (tab === 'playlists') {
                    const result = await window.api.getChannelPlaylists(id);
                    if (result.success) setPlaylists(result.data); else setStatus(result.error);
                }
                setStatus('');
            } catch (error) { setStatus(error.message); }
            setIsLoading(false);
        };

        if (activeTab === 'videos' && videos.length === 0) loadContent('videos');
        if (activeTab === 'live' && streams.length === 0) loadContent('live');
        if (activeTab === 'playlists' && playlists.length === 0) loadContent('playlists');
    }, [id, activeTab, videos.length, streams.length, playlists.length]);

    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, y: 10, duration: 0.4 }); }, [id]);

    const handlePlay = (vid) => navigate(`/watch?v=${vid}`);
    const handlePlaylist = (pid, ptitle) => navigate(`/playlist?id=${pid}&title=${encodeURIComponent(ptitle)}`);

    const renderTabContent = () => {
        if (isLoading) return <p className="text-[#b9baa3]/60 font-mono text-xs animate-pulse">{status || 'LOADING...'}</p>;

        if (activeTab === 'videos') return (
            <>
                {shorts.length > 0 && <ShortsSection title="CHANNEL_SHORTS" items={shorts} />}
                {videos.length > 0 ? <Section title="UPLOADS" videos={videos} onPlay={handlePlay} /> : <p className="text-[#b9baa3]/60 font-mono text-xs">NO VIDEOS FOUND.</p>}
            </>
        );

        if (activeTab === 'live') return streams.length > 0 ? <Section title="STREAMS" videos={streams} onPlay={handlePlay} /> : <p className="text-[#b9baa3]/60 font-mono text-xs">OFFLINE.</p>;

        if (activeTab === 'playlists') return playlists.length > 0 ? <PlaylistGrid playlists={playlists} onPlaylistClick={handlePlaylist} /> : <p className="text-[#b9baa3]/60 font-mono text-xs">EMPTY.</p>;

        return null;
    };

    const getTabClass = (tabName) => `px-8 py-4 font-bold text-xs border-b-2 transition-all font-mono tracking-widest ${activeTab === tabName ? 'border-[#a22c29] text-[#d6d5c9] bg-[#a22c29]/5' : 'border-transparent text-[#b9baa3]/60 hover:text-[#d6d5c9] hover:bg-[#b9baa3]/5'}`;

    return (
        <div ref={containerRef}>
            {/* Header Banner Area */}
            <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 bg-[#0a100d] border border-[#b9baa3]/10 shadow-2xl group z-0">

                {/* 1. Actual Banner */}
                {channelBanner ? (
                    <img src={channelBanner} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700" alt="Channel Banner" />
                ) : (
                    /* 2. Fallback: Use Channel Icon as blurred background if no banner exists */
                    channelIcon ? (
                        <img src={channelIcon} className="w-full h-full object-cover opacity-30 blur-[50px] scale-150 saturate-50" alt="Banner Fallback" />
                    ) : (
                        /* 3. Fallback: Default Gradient */
                        <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#0a100d] opacity-50">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        </div>
                    )
                )}

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a100d] via-[#0a100d]/40 to-transparent z-10"></div>

                {/* Channel Info Overlay */}
                <div className="absolute bottom-0 left-0 p-6 md:p-8 flex items-end gap-6 w-full z-20">
                    {channelIcon ? (
                        <img src={channelIcon} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-[#0a100d] shadow-[0_0_30px_rgba(0,0,0,0.6)] bg-[#0a100d]" />
                    ) : (
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#b9baa3]/20 border-4 border-[#0a100d]"></div>
                    )}

                    <div className="mb-2 flex flex-col justify-end h-full">
                        <h2 className="text-2xl md:text-4xl font-black text-[#d6d5c9] tracking-tight uppercase drop-shadow-lg">{decodeURIComponent(title)}</h2>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] font-bold bg-[#a22c29] text-white px-2 py-0.5 rounded border border-[#a22c29]/50 shadow-[0_0_10px_#a22c29]">VERIFIED</span>
                            <span className="text-[10px] text-[#b9baa3] font-mono uppercase tracking-widest drop-shadow-md">Official Channel</span>

                            {/* Subscribe Button */}
                            <button
                                onClick={handleSubscribe}
                                disabled={isModifyingSub}
                                className={`
                                    text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all duration-200
                                    ${isModifyingSub ? 'bg-[#b9baa3]/20 text-[#b9baa3]/80 cursor-wait' : isSubscribed
                                    ? 'bg-[#b9baa3]/10 text-[#b9baa3] border border-[#b9baa3]/30 hover:bg-[#a22c29] hover:text-white'
                                    : 'bg-[#a22c29] text-white border border-[#a22c29] hover:bg-white hover:text-[#a22c29]'
                                }
                                `}
                            >
                                {isModifyingSub ? '...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#b9baa3]/10 mb-8 overflow-x-auto custom-scrollbar">
                {['videos', 'live', 'playlists'].map(t => (
                    <button key={t} className={getTabClass(t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[300px]">
                {renderTabContent()}
            </div>
        </div>
    );
}
export default ChannelPage;