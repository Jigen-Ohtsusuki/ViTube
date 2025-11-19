import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function DownloadModal({ videoInfo, videoId, onClose }) {
    const [videoFormats, setVideoFormats] = useState([]);
    const [audioFormats, setAudioFormats] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedAudio, setSelectedAudio] = useState('');
    const [downloadStatus, setDownloadStatus] = useState('');
    const modalRef = useRef(null);

    useGSAP(() => { gsap.from(modalRef.current, { scale: 0.95, opacity: 0, duration: 0.4, ease: "back.out(1.2)" }); }, []);

    useEffect(() => {
        const allFormats = videoInfo.formats || [];
        const videos = allFormats.filter(f => f.vcodec !== 'none' && f.acodec === 'none' && (f.ext === 'mp4' || f.ext === 'webm')).sort((a, b) => b.height - a.height);
        const audios = allFormats.filter(f => f.acodec !== 'none' && f.vcodec === 'none' && (f.ext === 'm4a' || f.ext === 'opus')).sort((a, b) => b.abr - a.abr);
        setVideoFormats(videos); setAudioFormats(audios);
        if (videos.length > 0) setSelectedVideo(videos[0].format_id);
        if (audios.length > 0) setSelectedAudio(audios[0].format_id);
    }, [videoInfo]);

    const handleDownload = () => { if (!selectedVideo || !selectedAudio) { setDownloadStatus('SELECT FORMATS'); return; } setDownloadStatus('INITIALIZING...'); window.api.startDownload(videoId, selectedVideo, selectedAudio).then(result => { if (result.success) setDownloadStatus('COMPLETE'); else setDownloadStatus(`FAILED: ${result.error}`); }); };
    const formatSize = (bytes) => !bytes ? 'N/A' : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    return (
        <div className="fixed inset-0 bg-[#0a100d]/90 backdrop-blur-md flex items-center justify-center z-[200]" onClick={onClose}>
            <div ref={modalRef} className="bg-[#0a100d] p-8 rounded border border-[#a22c29]/30 w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8 border-b border-[#b9baa3]/10 pb-4"><h2 className="text-xl font-black text-[#d6d5c9] font-mono uppercase tracking-widest">Download Interface</h2><button onClick={onClose} className="text-[#b9baa3] hover:text-white"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg></button></div>
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <label className="block text-[10px] font-bold text-[#a22c29] mb-2 uppercase tracking-widest font-mono">Video Stream</label>
                        <div className="h-64 overflow-y-auto bg-[#0a100d] border border-[#b9baa3]/20 p-1 custom-scrollbar">
                            {videoFormats.map(f => (
                                <div key={f.format_id} onClick={() => setSelectedVideo(f.format_id)} className={`p-3 mb-1 text-xs cursor-pointer flex justify-between items-center transition-all font-mono ${selectedVideo === f.format_id ? 'bg-[#a22c29] text-[#d6d5c9] font-bold' : 'text-[#b9baa3] hover:bg-[#b9baa3]/10'}`}>
                                    <span>{f.height}p {f.dynamic_range === 'HDR10' && 'HDR'}</span><span className="opacity-60">{formatSize(f.filesize || f.filesize_approx)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#a22c29] mb-2 uppercase tracking-widest font-mono">Audio Stream</label>
                        <div className="h-64 overflow-y-auto bg-[#0a100d] border border-[#b9baa3]/20 p-1 custom-scrollbar">
                            {audioFormats.map(f => (
                                <div key={f.format_id} onClick={() => setSelectedAudio(f.format_id)} className={`p-3 mb-1 text-xs cursor-pointer flex justify-between items-center transition-all font-mono ${selectedAudio === f.format_id ? 'bg-[#a22c29] text-[#d6d5c9] font-bold' : 'text-[#b9baa3] hover:bg-[#b9baa3]/10'}`}>
                                    <span>{f.abr}k ({f.ext})</span><span className="opacity-60">{formatSize(f.filesize || f.filesize_approx)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={handleDownload} disabled={!!downloadStatus} className="w-full bg-[#d6d5c9] h-12 hover:bg-white disabled:opacity-50 font-bold text-sm transition-all text-[#0a100d] shadow-lg uppercase tracking-[0.2em] font-mono">{downloadStatus || 'INITIATE DOWNLOAD'}</button>
            </div>
        </div>
    );
}
export default DownloadModal;