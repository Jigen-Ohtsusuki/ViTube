import React from 'react';

function Section({ title, videos, onPlay }) {
    return (
        <section>
            <h2 className="text-xl font-bold mb-6 text-[#d6d5c9] font-mono tracking-widest flex items-center gap-4"><span className="w-8 h-px bg-[#a22c29]"></span>{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {videos.map((v, index) => {
                    const videoId = typeof v.id === 'string' ? v.id : v.id.videoId;
                    // FIX: Safely access the high/medium thumbnail URL, falling back to default if necessary.
                    const thumbnailUrl = v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url;

                    if (!thumbnailUrl) return null; // Skip rendering if no thumbnail exists

                    return (
                        <div
                            key={videoId}
                            onClick={() => onPlay(videoId)}
                            className="cursor-pointer group relative"
                        >
                            <div className="relative overflow-hidden rounded aspect-video bg-[#0a100d] border border-[#b9baa3]/10 group-hover:border-[#a22c29] transition-all">
                                <div className="absolute inset-0 bg-[#a22c29]/0 group-hover:bg-[#a22c29]/10 z-10 transition-colors"></div>
                                {/* Use the safely accessed thumbnailUrl */}
                                <img src={thumbnailUrl} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#a22c29] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                            </div>
                            <div className="mt-3">
                                <p className="font-bold text-xs line-clamp-2 leading-relaxed text-[#d6d5c9] group-hover:text-white transition-colors font-sans">{v.snippet.title}</p>
                                <p className="text-[10px] text-[#b9baa3]/60 mt-1 font-mono uppercase tracking-wide group-hover:text-[#a22c29] transition-colors">{v.snippet.channelTitle}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
export default Section;