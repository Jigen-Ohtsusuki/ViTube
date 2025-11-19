import React from 'react';

function PlaylistGrid({ playlists, onPlaylistClick }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {playlists.map(pl => (
                <div key={pl.id} onClick={() => onPlaylistClick(pl.id, pl.snippet.title)} className="cursor-pointer group">
                    <div className="relative">
                        <img src={pl.snippet.thumbnails.medium.url} className="w-full aspect-video object-cover rounded border border-[#b9baa3]/10 group-hover:border-[#a22c29] transition-all shadow-lg" />
                        <div className="absolute bottom-2 right-2 bg-[#0a100d]/90 px-2 py-1 rounded text-[9px] font-bold text-[#d6d5c9] border border-[#b9baa3]/20 font-mono">{pl.contentDetails.itemCount} ITEMS</div>
                    </div>
                    <p className="font-bold mt-3 line-clamp-1 text-[#d6d5c9] group-hover:text-[#a22c29] transition-colors text-xs font-mono uppercase">{pl.snippet.title}</p>
                </div>
            ))}
        </div>
    );
}
export default PlaylistGrid;