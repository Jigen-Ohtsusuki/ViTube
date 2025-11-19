import { useNavigate } from 'react-router-dom';

function ShortsSection({ title = "SHORTS_FEED", items = [] }) {
    const navigate = useNavigate();

    if (!items || items.length === 0) return null;

    return (
        <section className="mb-10">
            <h2 className="text-xl font-bold mb-6 text-[#d6d5c9] font-mono tracking-widest flex items-center gap-4">
                <span className="w-8 h-px bg-[#a22c29]"></span>
                <span className="text-[#a22c29] mr-2">⚡</span>{title}
            </h2>

            <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
                {items.map((item) => {
                    const id = typeof item.id === 'string' ? item.id : item.id.videoId;
                    const thumb = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url;

                    return (
                        <div
                            key={id}
                            onClick={() => navigate(`/watch?v=${id}`)}
                            className="flex-shrink-0 w-[200px] aspect-[9/16] relative rounded-xl overflow-hidden cursor-pointer group border border-[#b9baa3]/10 hover:border-[#a22c29] transition-all snap-start"
                        >
                            <img src={thumb} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a100d] via-transparent to-transparent opacity-90"></div>

                            <div className="absolute top-2 right-2 bg-[#a22c29]/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 shadow-lg">
                                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 7.18c-1.83.96-2.53 3.23-1.56 5.06.16.31.37.59.63.82l-1.48.82c-1.84.96-2.53 3.23-1.56 5.06s3.24 2.53 5.07 1.56l8.5-4.74c1.83-.96 2.53-3.23 1.56-5.06-.16-.31-.38-.59-.63-.82zM6.09 11.12c-.72-.39-.99-1.28-.6-1.99s1.29-.99 2.01-.6l7.17 3.99c.1.05.18.12.26.19-.26.57-.63 1.09-1.12 1.51L6.09 11.12zm11.82 1.76c.72.39.99 1.28.6 1.99s-1.29.99-2.01.6l-7.17-3.99c-.1-.06-.19-.13-.27-.2.26-.56.64-1.07 1.12-1.49l7.73 3.09z"/></svg>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-sm font-bold text-white line-clamp-2 leading-tight mb-2 font-sans group-hover:text-[#a22c29] transition-colors">{item.snippet.title}</p>
                                <p className="text-[10px] text-[#b9baa3] font-mono uppercase tracking-wider">{item.snippet.channelTitle}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
export default ShortsSection;