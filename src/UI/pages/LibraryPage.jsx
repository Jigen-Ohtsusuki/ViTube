import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PlaylistGrid from '../components/PlaylistGrid';

function LibraryPage() {
    const [playlists, setPlaylists] = useState([]);
    const [status, setStatus] = useState('LOADING ARCHIVES...');
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => { if (window.api) { window.api.getMyPlaylists().then(result => { if (result.success) { setPlaylists(result.data); setStatus(''); } else { setStatus(`ERR: ${result.error}`); } }); } }, []);
    const handlePlaylist = (pid, ptitle) => navigate(`/playlist?id=${pid}&title=${encodeURIComponent(ptitle)}`);

    return (
        <div ref={containerRef}>
            <h2 className="text-xl font-bold mb-8 text-[#d6d5c9] font-mono tracking-widest">PERSONAL_ARCHIVES</h2>
            {status && <p className="text-[#b9baa3]/60 font-mono text-xs">{status}</p>}
            <PlaylistGrid playlists={playlists} onPlaylistClick={handlePlaylist} />
        </div>
    );
}
export default LibraryPage;