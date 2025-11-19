import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function PlaylistPage() {
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('');
    const [searchParams] = useSearchParams();
    const playlistId = searchParams.get('id');
    const title = searchParams.get('title');
    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        if (playlistId && window.api) {
            setStatus('RETRIEVING LIST...');
            window.api.getPlaylistItems(playlistId).then(result => {
                if (result.success) {
                    setItems(result.data);
                    setStatus('');
                } else {
                    setStatus(`ERR: ${result.error}`);
                }
            });
        }
    }, [playlistId]);

    useGSAP(() => { if(items.length > 0) gsap.from(containerRef.current, { opacity: 0, x: 20, duration: 0.4 }); }, [items]);

    const onVideoClick = (videoId) => navigate(`/watch?v=${videoId}`);

    return (
        <div ref={containerRef}>
            <h2 className="text-2xl font-black mb-8 text-[#d6d5c9] uppercase font-mono tracking-tight">{decodeURIComponent(title)}</h2>
            {status && <p className="text-[#b9baa3] font-mono text-xs">{status}</p>}
            <div className="flex flex-col gap-1">
                {items.map((item, index) => {
                    // FIX: Safely access the thumbnail URL using optional chaining
                    const thumbnailUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;

                    // Ensure we have both a thumbnail and a video ID before attempting to render/link
                    if (!thumbnailUrl || !item.snippet?.resourceId?.videoId) return null;

                    return (
                        <div
                            key={item.id}
                            className="flex items-center p-3 rounded hover:bg-[#b9baa3]/10 cursor-pointer transition-colors group border-b border-[#b9baa3]/5 hover:border-[#a22c29]/30"
                            onClick={() => onVideoClick(item.snippet.resourceId.videoId)}
                        >
                            <span className="text-[#b9baa3]/40 w-12 text-center group-hover:hidden font-mono text-xs">{index + 1}</span>
                            <span className="hidden w-12 text-center group-hover:block text-[#a22c29] font-bold">▶</span>
                            <img src={thumbnailUrl} alt={item.snippet.title} className="w-32 aspect-video rounded-sm mr-4 object-cover border border-[#b9baa3]/10 transition-all" />
                            <span className="text-sm font-bold line-clamp-1 text-[#d6d5c9] group-hover:text-white font-sans">{item.snippet.title}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
export default PlaylistPage;