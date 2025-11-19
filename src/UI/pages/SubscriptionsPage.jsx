import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function SubscriptionsPage() {
    const [subs, setSubs] = useState([]);
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => { if(window.api) window.api.getSubscriptions().then(r => r.success && setSubs(r.data)); }, []);

    return (
        <div ref={containerRef}>
            <h2 className="text-xl font-bold mb-8 text-[#d6d5c9] font-mono tracking-widest">SUBSCRIPTIONS_DB</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {subs.map(s => (
                    <div key={s.id} onClick={() => navigate(`/channel?id=${s.snippet.resourceId.channelId}&title=${encodeURIComponent(s.snippet.title)}`)} className="flex flex-col items-center p-6 bg-[#b9baa3]/5 border border-[#b9baa3]/10 hover:border-[#a22c29] rounded cursor-pointer transition-all hover:bg-[#b9baa3]/10 group">
                        <img src={s.snippet.thumbnails.medium.url} className="w-20 h-20 rounded-full mb-4 transition-all border-2 border-transparent group-hover:border-[#a22c29] shadow-lg" />
                        <span className="font-bold text-xs truncate w-full text-center text-[#d6d5c9] group-hover:text-white font-mono uppercase">{s.snippet.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
export default SubscriptionsPage;