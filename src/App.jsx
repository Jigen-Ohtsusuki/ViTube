import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { categoryMap } from './categoryMap';
import { useAppStore } from './store';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function App() {
    const [version, setVersion] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        if (window.api) {
            window.api.getVersion().then(setVersion);
        }
    }, []);

    const handleLogin = async () => {
        try {
            const result = await window.api.login();
            if (result.success) {
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="h-screen w-screen flex bg-[#0f0f0f] text-white overflow-hidden font-sans selection:bg-white selection:text-black">
            <Sidebar version={version} />
            <div className="flex-1 flex flex-col h-full relative">
                <header className="w-full p-4 flex-shrink-0 z-40 bg-[#0f0f0f] border-b border-[#222]">
                    <SearchBar />
                </header>

                <main className="flex-1 overflow-y-auto p-6 pt-4 pb-32 relative z-0 scroll-smooth">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/subscriptions" element={<SubscriptionsPage />} />
                        <Route path="/library" element={<LibraryPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/channel" element={<ChannelPage />} />
                        <Route path="/playlist" element={<PlaylistPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/watch" element={<WatchPagePlaceholder />} />
                    </Routes>
                </main>

                <GlobalPlayer />
            </div>
        </div>
    );
}

function GlobalPlayer() {
    const { currentVideoId, isAudioMode, videoInfo, setVideoInfo, closeVideo, playVideo } = useAppStore();
    const { autoplay, sponsorBlockEnabled } = useAppStore();
    const setPipElement = useAppStore((state) => state.setPipElement);
    const clearPipElement = useAppStore((state) => state.clearPipElement);
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const playerContainerRef = useRef(null);

    const [playableUrl, setPlayableUrl] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [channelIcon, setChannelIcon] = useState(null);

    const [videoQualities, setVideoQualities] = useState([]);
    const [audioQualities, setAudioQualities] = useState([]);
    const [currentVideoLabel, setCurrentVideoLabel] = useState('Auto');
    const [currentAudioLabel, setCurrentAudioLabel] = useState('Auto');
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sponsorSegments, setSponsorSegments] = useState([]);
    const [showSkipToast, setShowSkipToast] = useState(false);

    const mediaRef = useRef(null);
    const audioRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const historyAdded = useRef(false);

    const isWatchPage = location.pathname === '/watch';
    const hasVideo = !!currentVideoId;

    useEffect(() => {
        const video = mediaRef.current;
        const audio = audioRef.current;

        const sync = () => {
            if (!video || !audio) return;

            if (Math.abs(video.currentTime - audio.currentTime) > 0.2) {
                audio.currentTime = video.currentTime;
            }

            if (video.paused !== audio.paused) {
                if (video.paused) audio.pause();
                else audio.play().catch(() => {});
            }

            if (video.playbackRate !== audio.playbackRate) {
                audio.playbackRate = video.playbackRate;
            }

            if (audio.volume !== volume) audio.volume = volume;
        };

        const interval = setInterval(sync, 250);
        return () => clearInterval(interval);
    }, [playableUrl, audioUrl, volume]);

    useGSAP(() => {
        if (hasVideo && !isWatchPage) {
            gsap.fromTo(containerRef.current,
                { y: 100, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
            );
        }
    }, [hasVideo, isWatchPage]);

    const formatTime = (seconds) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        if (currentVideoId && window.api) {
            historyAdded.current = false;
            setRelatedVideos([]);
            setChannelIcon(null);
            setVideoQualities([]);
            setAudioQualities([]);
            setSponsorSegments([]);
            setPlayableUrl(null);
            setAudioUrl(null);

            if (sponsorBlockEnabled) {
                window.api.getSponsorSegments(currentVideoId).then(res => {
                    if (res.success) setSponsorSegments(res.data);
                });
            }

            window.api.getFormats(currentVideoId).then(result => {
                if (result.success) {
                    const data = result.data;
                    setVideoInfo(data);

                    const rawFormats = data.formats || [];

                    const vOpts = rawFormats
                        .filter(f => f.vcodec !== 'none' && (f.ext === 'mp4' || f.ext === 'webm'))
                        .sort((a, b) => (b.height || 0) - (a.height || 0));

                    const uniqueV = [];
                    const seenV = new Set();
                    vOpts.forEach(f => {
                        if (!f.height) return;
                        const isHDR = f.dynamic_range === 'HDR10' || f.dynamic_range === 'HLG';
                        const hdrLabel = isHDR ? ' HDR' : '';
                        const codecLabel = f.vcodec && f.vcodec.startsWith('av01') ? ' (AV1)' : (f.vcodec && f.vcodec.startsWith('vp9') ? ' (VP9)' : '');
                        const label = `${f.height}p${hdrLabel}${codecLabel}`;
                        const key = label + f.url;
                        if(!seenV.has(key)) {
                            seenV.add(key);
                            uniqueV.push({ label, ...f });
                        }
                    });
                    setVideoQualities(uniqueV);

                    const aOpts = rawFormats
                        .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
                        .sort((a, b) => (b.abr || 0) - (a.abr || 0));

                    const uniqueA = [];
                    aOpts.forEach(f => {
                        if(!f.abr) return;
                        const label = `${f.abr.toFixed(0)}kbps (${f.ext})`;
                        uniqueA.push({ label, ...f });
                    });
                    setAudioQualities(uniqueA);

                    if (isAudioMode) {
                        const bestAudio = uniqueA[0];
                        if(bestAudio) {
                            setAudioUrl(bestAudio.url);
                            setCurrentAudioLabel(bestAudio.label);
                        }
                    } else {
                        const bestVideo = uniqueV[0];
                        const bestAudio = uniqueA[0];

                        if (bestVideo) {
                            setPlayableUrl(bestVideo.url);
                            setCurrentVideoLabel(bestVideo.label);
                        } else {
                            setPlayableUrl(data.url);
                        }

                        if (bestAudio) {
                            setAudioUrl(bestAudio.url);
                            setCurrentAudioLabel(bestAudio.label);
                        }
                    }

                    if (data.channel_id) {
                        window.api.getChannelIcon(data.channel_id).then(iconRes => {
                            if (iconRes.success) setChannelIcon(iconRes.data);
                        });
                    }

                    const catName = data.categories ? data.categories[0] : 'Unknown';
                    const catId = categoryMap[catName] || null;

                    if (!historyAdded.current) {
                        window.api.addHistory(currentVideoId, data.title, data.uploader, data.channel_id, catId, catName);
                        historyAdded.current = true;
                    }

                    if (catId) {
                        window.api.getTrendingByCategory(catId).then(rec => {
                            if (rec.success) setRelatedVideos(rec.data.filter(v => v.id !== currentVideoId));
                        });
                    }
                }
            });
        }
    }, [currentVideoId, setVideoInfo, sponsorBlockEnabled, isAudioMode]);

    useEffect(() => {
        const el = mediaRef.current;
        if (!el) return;

        const updateTime = () => {
            setCurrentTime(el.currentTime);
            if (sponsorBlockEnabled && sponsorSegments.length > 0) {
                for (const segment of sponsorSegments) {
                    if (el.currentTime >= segment.segment[0] && el.currentTime < segment.segment[1]) {
                        el.currentTime = segment.segment[1];
                        if (audioRef.current) audioRef.current.currentTime = segment.segment[1];
                        setShowSkipToast(true);
                        setTimeout(() => setShowSkipToast(false), 2000);
                        break;
                    }
                }
            }
        };

        const updateDuration = () => setDuration(el.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        el.addEventListener('timeupdate', updateTime);
        el.addEventListener('loadedmetadata', updateDuration);
        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);

        const onEnterPiP = () => setPipElement(el);
        const onLeavePiP = () => clearPipElement();
        el.addEventListener('enterpictureinpicture', onEnterPiP);
        el.addEventListener('leavepictureinpicture', onLeavePiP);

        return () => {
            el.removeEventListener('timeupdate', updateTime);
            el.removeEventListener('loadedmetadata', updateDuration);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('enterpictureinpicture', onEnterPiP);
            el.removeEventListener('leavepictureinpicture', onLeavePiP);
            clearPipElement();
        };
    }, [playableUrl, sponsorBlockEnabled, sponsorSegments]);

    useEffect(() => {
        const el = mediaRef.current;
        if (playableUrl && el && el.src !== playableUrl) {
            const prevTime = el.currentTime;
            el.src = playableUrl;
            el.currentTime = prevTime;
            el.playbackRate = playbackRate;
            el.play().catch(console.warn);
        }
    }, [playableUrl]);

    useEffect(() => {
        if (mediaRef.current) mediaRef.current.playbackRate = playbackRate;
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
    }, [playbackRate]);

    const togglePlay = (e) => {
        e?.stopPropagation();
        if (mediaRef.current) {
            if (mediaRef.current.paused) mediaRef.current.play();
            else mediaRef.current.pause();
        }
    };

    const handleSeek = (e) => {
        const seekTime = parseFloat(e.target.value);
        if (mediaRef.current) mediaRef.current.currentTime = seekTime;
        if (audioRef.current) audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (audioRef.current) audioRef.current.volume = val;
        else if (mediaRef.current) mediaRef.current.volume = val;
    };

    const toggleFullscreen = (e) => {
        e?.stopPropagation();
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleQualityChange = (q) => {
        setCurrentVideoLabel(q.label);
        setPlayableUrl(q.url);
        setShowQualityMenu(false);
    };

    const handleAudioQualityChange = (q) => {
        setCurrentAudioLabel(q.label);
        setAudioUrl(q.url);
        setShowAudioMenu(false);
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const handleVideoEnd = () => {
        if (autoplay && relatedVideos.length > 0) {
            playVideo(relatedVideos[0].id, isAudioMode);
            if (isWatchPage) navigate(`/watch?v=${relatedVideos[0].id}`);
        }
    };

    const maximizePlayer = () => {
        if (!isWatchPage) navigate(`/watch?v=${currentVideoId}${isAudioMode ? '&audio=true' : ''}`);
    };

    const handleMiniPlayer = async (e) => {
        e?.stopPropagation();
        if (!mediaRef.current) return;
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await mediaRef.current.requestPictureInPicture();
    };

    if (!hasVideo) return null;

    const containerClass = isWatchPage
        ? "absolute inset-0 z-50 bg-[#0f0f0f] flex overflow-hidden"
        : "fixed bottom-6 right-6 w-96 bg-[#1e1e1e] rounded-xl shadow-2xl z-[100] border border-gray-700 flex flex-col overflow-hidden transition-all duration-300";

    const wrapperClass = isWatchPage
        ? "flex-1 flex flex-col p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-[#333]"
        : "w-full flex-col";

    const videoContainerClass = isWatchPage
        ? "w-full max-w-[1280px] mx-auto"
        : "w-full";

    const videoAspectRatioClass = isWatchPage
        ? "relative bg-black rounded-xl overflow-hidden aspect-video border border-[#222] group select-none shadow-2xl"
        : "relative w-full aspect-video bg-black group";

    return (
        <div className={containerClass} ref={containerRef}>
            {showDownloadModal && videoInfo && (
                <DownloadModal videoInfo={videoInfo} videoId={currentVideoId} onClose={() => setShowDownloadModal(false)} />
            )}

            {showSkipToast && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg z-[60] flex items-center gap-2 animate-pulse pointer-events-none border border-purple-400">
                    <span className="text-sm font-bold">Sponsor Skipped</span>
                </div>
            )}

            {!isWatchPage && (
                <button
                    onClick={(e) => { e.stopPropagation(); closeVideo(); }}
                    className="absolute top-2 right-2 bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-30"
                >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            )}

            <div className={wrapperClass}>
                <div className={videoContainerClass}>
                    <div
                        ref={playerContainerRef}
                        className={videoAspectRatioClass}
                        onMouseMove={isWatchPage ? handleMouseMove : undefined}
                        onMouseLeave={isWatchPage ? () => isPlaying && setShowControls(false) : undefined}
                        onDoubleClick={isWatchPage ? toggleFullscreen : undefined}
                        onClick={!isWatchPage ? maximizePlayer : undefined}
                    >
                        <div className={`absolute inset-0 bg-black flex items-center justify-center z-0 ${isAudioMode ? 'block' : 'hidden'}`}>
                            <img src={videoInfo?.thumbnail} className={`object-cover opacity-60 ${isWatchPage ? 'h-3/4 aspect-video rounded-lg border border-[#333] absolute' : 'w-full h-full opacity-50'}`} />
                            {isWatchPage && <img src={videoInfo?.thumbnail} className="h-2/3 aspect-video object-contain rounded-lg shadow-2xl z-10" />}
                            {!isWatchPage && <div className="absolute inset-0 flex items-center justify-center z-20"><span className="text-3xl">🎵</span></div>}
                        </div>

                        <video
                            ref={mediaRef}
                            className={`w-full h-full object-contain relative z-10 ${isAudioMode ? 'opacity-0' : 'opacity-100'}`}
                            autoPlay
                            onClick={isWatchPage ? togglePlay : undefined}
                            onEnded={handleVideoEnd}
                        />

                        {audioUrl && <audio ref={audioRef} src={audioUrl} autoPlay />}

                        {isWatchPage && (
                            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 z-20 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>

                                <div className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/bar mb-4 hover:h-2.5 transition-all" onClick={(e) => e.stopPropagation()}>
                                    {sponsorSegments.map(seg => {
                                        const start = (seg.segment[0] / duration) * 100;
                                        const width = ((seg.segment[1] - seg.segment[0]) / duration) * 100;
                                        return <div key={seg.UUID} className="absolute top-0 h-full bg-purple-500 z-10 pointer-events-none opacity-80" style={{ left: `${start}%`, width: `${width}%` }} />
                                    })}
                                    <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full z-20 pointer-events-none" style={{ width: `${(currentTime / duration) * 100}%` }} />
                                    <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                                </div>

                                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-4">
                                        <button onClick={togglePlay} className="hover:text-red-500 transition-colors">
                                            {isPlaying ? <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="w-24 h-1 bg-white rounded-lg appearance-none cursor-pointer" />
                                        </div>

                                        <span className="text-xs font-medium text-gray-300 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {!isAudioMode && videoQualities.length > 0 && (
                                            <div className="relative">
                                                <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition border border-white/10 min-w-[60px]">{currentVideoLabel}</button>
                                                {showQualityMenu && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowQualityMenu(false)}></div>
                                                        <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl p-1 z-50 min-w-[140px] max-h-60 overflow-y-auto flex flex-col-reverse custom-scrollbar">
                                                            {videoQualities.map(q => (
                                                                <button key={q.label + q.url} onClick={() => handleQualityChange(q)} className={`block w-full text-left px-3 py-2 text-xs rounded hover:bg-[#333] ${currentVideoLabel === q.label ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>
                                                                    {q.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {audioQualities.length > 0 && (
                                            <div className="relative">
                                                <button onClick={() => setShowAudioMenu(!showAudioMenu)} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition border border-white/10 min-w-[60px] max-w-[100px] truncate">{currentAudioLabel}</button>
                                                {showAudioMenu && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowAudioMenu(false)}></div>
                                                        <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl p-1 z-50 min-w-[140px] max-h-60 overflow-y-auto flex flex-col-reverse custom-scrollbar">
                                                            {audioQualities.map(q => (
                                                                <button key={q.label + q.url} onClick={() => handleAudioQualityChange(q)} className={`block w-full text-left px-3 py-2 text-xs rounded hover:bg-[#333] ${currentAudioLabel === q.label ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>
                                                                    {q.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        <button onClick={handleMiniPlayer} title="Mini Player" className="hover:text-white text-gray-300">
                                            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>
                                        </button>

                                        <button onClick={toggleFullscreen} title="Fullscreen" className="hover:text-white text-gray-300">
                                            {isFullscreen ? <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg> : <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {isWatchPage && (
                        <div className="mt-6">
                            <h1 className="text-2xl font-bold line-clamp-2 text-white">{videoInfo?.title || 'Loading...'}</h1>
                            <div className="flex justify-between items-start mt-4 pb-4 border-b border-[#222]">
                                <Link
                                    to={`/channel?id=${videoInfo?.channel_id}&title=${encodeURIComponent(videoInfo?.uploader)}`}
                                    className="flex items-center gap-3 group"
                                >
                                    {channelIcon ? <img src={channelIcon} className="w-10 h-10 rounded-full object-cover border border-[#333]" /> : <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333]"></div>}
                                    <div>
                                        <p className="text-lg font-bold text-white group-hover:text-[#ccc] transition-colors">{videoInfo?.uploader}</p>
                                        <p className="text-xs text-[#777]">Subscribe</p>
                                    </div>
                                </Link>
                                <div className="flex gap-3 items-center">
                                    <div className="relative">
                                        <select value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="bg-[#222] text-white text-sm px-4 py-2 rounded-full border border-[#333] outline-none focus:border-[#555] appearance-none pr-8 cursor-pointer hover:bg-[#333] transition-colors">
                                            <option value="0.5">0.5x</option><option value="1">1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                                        </select>
                                    </div>
                                    <button onClick={() => setShowDownloadModal(true)} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-[#ddd] transition-colors flex items-center gap-2">Download</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isWatchPage && (
                <div className="w-[400px] bg-[#0f0f0f] border-l border-[#222] overflow-y-auto p-4 hidden xl:block">
                    <h3 className="text-lg font-bold mb-4 text-white">Up Next</h3>
                    <div className="flex flex-col gap-2">
                        {relatedVideos.map(v => (
                            <div key={v.id} onClick={() => { playVideo(v.id, isAudioMode); navigate(`/watch?v=${v.id}${isAudioMode ? '&audio=true' : ''}`) }} className="flex gap-2 cursor-pointer hover:bg-[#1f1f1f] p-2 rounded-lg transition-colors group">
                                <div className="relative flex-shrink-0">
                                    <img src={v.snippet.thumbnails.default.url} className="w-40 aspect-video object-cover rounded-lg border border-transparent group-hover:border-[#333]" />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-sm font-bold line-clamp-2 text-white leading-snug">{v.snippet.title}</p>
                                    <p className="text-xs text-[#aaa] mt-1 flex items-center gap-1">{v.snippet.channelTitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isWatchPage && (
                <div className="p-3 bg-[#1a1a1a] flex justify-between items-center cursor-pointer border-t border-[#333]" onClick={maximizePlayer}>
                    <div className="truncate flex-1 pr-3">
                        <p className="text-sm font-bold truncate text-white">{videoInfo?.title || 'Loading...'}</p>
                        <p className="text-xs text-[#aaa]">{videoInfo?.uploader}</p>
                    </div>
                    {isAudioMode && <span className="text-[10px] bg-[#333] text-[#ccc] px-2 py-1 rounded border border-[#444]">AUDIO</span>}
                </div>
            )}
        </div>
    );
}

function WatchPagePlaceholder() {
    const [searchParams] = useSearchParams();
    const vParam = searchParams.get('v');
    const audioParam = searchParams.get('audio') === 'true';
    const { playVideo, currentVideoId, isAudioMode } = useAppStore();
    useEffect(() => { if (vParam && (vParam !== currentVideoId || audioParam !== isAudioMode)) playVideo(vParam, audioParam); }, [vParam, audioParam]);
    return null;
}

function Sidebar({ version }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pipElement = useAppStore((state) => state.pipElement);
    const handleNavigate = async (to) => {
        if (document.pictureInPictureElement && pipElement) await document.exitPictureInPicture();
        navigate(to);
    };
    const isActive = (path) => location.pathname === path;
    const linkClass = (path) => `flex w-full items-center gap-4 text-sm font-medium p-3 rounded-lg mb-1 text-left transition-all duration-200 ${isActive(path) ? 'bg-[#222] text-white' : 'text-[#aaa] hover:bg-[#1a1a1a] hover:text-white'}`;
    return (
        <nav className="w-64 flex-shrink-0 bg-[#0f0f0f] p-4 flex flex-col border-r border-[#222]">
            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">V</div>
                <h1 className="text-xl font-bold tracking-tight text-white">ViTube</h1>
            </div>
            <button onClick={() => handleNavigate('/')} className={linkClass('/')}>Home</button>
            <button onClick={() => handleNavigate('/subscriptions')} className={linkClass('/subscriptions')}>Subscriptions</button>
            <button onClick={() => handleNavigate('/library')} className={linkClass('/library')}>Library</button>
            <button onClick={() => handleNavigate('/settings')} className={linkClass('/settings')}>Settings</button>
            <div className="flex-grow"></div>
            <span className="text-[10px] text-[#444] px-3 pb-2 font-mono uppercase">v{version}</span>
        </nav>
    );
}

function SearchBar() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();
    const pipElement = useAppStore((state) => state.pipElement);
    const containerRef = useRef(null);
    useEffect(() => {
        if (query.trim().length < 2) { setSuggestions([]); return; }
        const t = setTimeout(() => { if(window.api) window.api.getSuggestions(query).then(r => r.success && setSuggestions(r.data)); }, 300);
        return () => clearTimeout(t);
    }, [query]);
    useGSAP(() => { if (suggestions.length > 0) gsap.fromTo(".suggestion-item", { opacity: 0, y: -5 }, { opacity: 1, y: 0, stagger: 0.03, duration: 0.2, ease: "power2.out" }); }, [suggestions]);
    const goSearch = async (q) => {
        if (document.pictureInPictureElement && pipElement) await document.exitPictureInPicture();
        navigate(`/search?q=${encodeURIComponent(q)}`);
        setSuggestions([]);
    };
    return (
        <form onSubmit={(e) => { e.preventDefault(); goSearch(query); }} className="w-full max-w-[600px] mx-auto relative" ref={containerRef}>
            <div className="flex relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg className="h-4 w-4 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#333] rounded-full text-white focus:border-[#555] outline-none placeholder-[#555] transition-colors" />
            </div>
            {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-[#1a1a1a] border border-[#333] rounded-xl mt-2 overflow-hidden py-2 z-50">
                    {suggestions.map(s => (<li key={s} onMouseDown={() => { setQuery(s); goSearch(s); }} className="suggestion-item px-4 py-2.5 hover:bg-[#333] cursor-pointer text-sm text-[#ddd] flex items-center gap-3"><svg className="h-3 w-3 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>{s}</li>))}
                </ul>
            )}
        </form>
    );
}

function LoginScreen({ onLogin }) {
    const containerRef = useRef(null);
    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, y: 30, duration: 1, ease: "power3.out" }); }, []);
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f0f0f] text-white">
            <div ref={containerRef} className="flex flex-col items-center">
                <h1 className="text-6xl font-bold mb-8 tracking-tighter"><span className="text-red-600">Vi</span>Tube</h1>
                <button onClick={onLogin} className="px-8 py-4 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] hover:border-[#555] rounded-xl text-lg font-medium transition-all flex items-center gap-3 text-[#ddd]">Sign In with Google</button>
            </div>
        </div>
    );
}

function HomePage() {
    const { playVideo } = useAppStore();
    const navigate = useNavigate();
    const [data, setData] = useState({ history: [], recs: [], trending: [] });
    const [status, setStatus] = useState('Loading...');
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
                setData({ history: hist.success ? hist.data : [], trending: trend.success ? trend.data : [], recs: recs.success ? recs.data : [] });
                setStatus('');
            } catch(e) { setStatus(e.message); }
        };
        load();
    }, []);
    const handlePlay = (id) => navigate(`/watch?v=${id}`);
    useGSAP(() => { if (data.trending.length > 0) gsap.from(".animate-section", { opacity: 0, y: 20, stagger: 0.1, duration: 0.6, ease: "power2.out" }); }, [data.trending]);
    return (
        <div ref={containerRef} className="flex flex-col gap-12">
            {status && <p className="text-gray-500 text-center mt-10">{status}</p>}
            {data.trending.length > 0 && <div className="animate-section"><Section title="Trending Now" videos={data.trending} onPlay={handlePlay} /></div>}
            {data.recs.length > 0 && <div className="animate-section"><Section title="Recommended" videos={data.recs} onPlay={handlePlay} /></div>}
            {data.history.length > 0 && (
                <section className="animate-section">
                    <h2 className="text-2xl font-bold mb-6 text-white">Recently Viewed</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {data.history.map(v => (
                            <div key={v.id} onClick={() => handlePlay(v.videoId)} className="cursor-pointer bg-[#181818] p-3 rounded-xl border border-transparent hover:border-[#333] transition-all group">
                                <p className="font-bold truncate text-gray-200 group-hover:text-white">{v.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{v.channel}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Section({ title, videos, onPlay }) {
    return (
        <section>
            <h2 className="text-2xl font-bold mb-6 text-white">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                {videos.map((v, index) => (
                    <div key={typeof v.id === 'string' ? v.id : v.id.videoId} onClick={() => onPlay(typeof v.id === 'string' ? v.id : v.id.videoId)} className="cursor-pointer group">
                        <div className="relative overflow-hidden rounded-xl">
                            <img src={v.snippet.thumbnails.medium.url} className="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="mt-3 flex gap-3">
                            {v.channelThumbnail ? <img src={v.channelThumbnail} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[#222]" /> : <div className="w-9 h-9 rounded-full bg-[#222] flex-shrink-0 flex items-center justify-center border border-[#333]"><svg className="w-4 h-4 text-[#555]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>}
                            <div className="min-w-0 pt-0.5">
                                <p className="font-bold text-sm line-clamp-2 leading-snug text-white group-hover:text-blue-400 transition-colors">{v.snippet.title}</p>
                                <p className="text-xs text-[#aaa] mt-1 hover:text-white transition-colors">{v.snippet.channelTitle}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SearchPage() {
    const [searchParams] = useSearchParams();
    const q = searchParams.get('q');
    const [results, setResults] = useState([]);
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => { if(q && window.api) window.api.search(q).then(r => r.success && setResults(r.data)); }, [q]);
    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, y: 20, duration: 0.4 }); }, [q]);
    const handlePlay = (id) => navigate(`/watch?v=${id}`);
    return (
        <div ref={containerRef}>
            <h2 className="text-2xl font-bold mb-6 text-white">Results for "{q}"</h2>
            <Section title="" videos={results} onPlay={handlePlay} />
        </div>
    );
}

function SubscriptionsPage() {
    const [subs, setSubs] = useState([]);
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => { if(window.api) window.api.getSubscriptions().then(r => r.success && setSubs(r.data)); }, []);
    return (
        <div ref={containerRef}>
            <h2 className="text-2xl font-bold mb-6 text-white">Subscriptions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {subs.map(s => (
                    <div key={s.id} onClick={() => navigate(`/channel?id=${s.snippet.resourceId.channelId}&title=${encodeURIComponent(s.snippet.title)}`)} className="sub-item flex flex-col items-center p-6 bg-[#181818] border border-transparent hover:border-[#333] rounded-2xl cursor-pointer transition-all text-center group hover:bg-[#202020]">
                        <img src={s.snippet.thumbnails.medium.url} className="w-20 h-20 rounded-full mb-4 group-hover:scale-110 transition-transform border-2 border-transparent group-hover:border-white" />
                        <span className="font-bold text-sm truncate w-full text-gray-200 group-hover:text-white">{s.snippet.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChannelPage() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const title = searchParams.get('title');
    const [activeTab, setActiveTab] = useState('videos');
    const [videos, setVideos] = useState([]);
    const [streams, setStreams] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [channelIcon, setChannelIcon] = useState(null);
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => {
        if (!id || !window.api) return;
        window.api.getChannelIcon(id).then(r => r.success && setChannelIcon(r.data));
        const loadContent = async (tab) => {
            setIsLoading(true); setStatus(`Loading ${tab}...`);
            try {
                if (tab === 'videos') { const result = await window.api.getChannelContent(id, 'video'); if (result.success) setVideos(result.data); else setStatus(result.error); }
                else if (tab === 'live') { const result = await window.api.getChannelContent(id, 'live'); if (result.success) setStreams(result.data); else setStatus(result.error); }
                else if (tab === 'playlists') { const result = await window.api.getChannelPlaylists(id); if (result.success) setPlaylists(result.data); else setStatus(result.error); }
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
        if (isLoading) return <p className="text-gray-500">{status || 'Loading...'}</p>;
        if (activeTab === 'videos') return videos.length > 0 ? <Section title="" videos={videos} onPlay={handlePlay} /> : <p className="text-gray-500">No videos found.</p>;
        if (activeTab === 'live') return streams.length > 0 ? <Section title="" videos={streams} onPlay={handlePlay} /> : <p className="text-gray-500">No live streams found.</p>;
        if (activeTab === 'playlists') return playlists.length > 0 ? <PlaylistGrid playlists={playlists} onPlaylistClick={handlePlaylist} /> : <p className="text-gray-500">No playlists found.</p>;
        return null;
    };
    const getTabClass = (tabName) => `px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === tabName ? 'border-white text-white' : 'border-transparent text-[#888] hover:text-white'}`;
    return (
        <div ref={containerRef}>
            <div className="mb-8 p-8 bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border border-[#222] rounded-2xl flex items-center gap-6">
                {channelIcon ? <img src={channelIcon} className="w-24 h-24 rounded-full border-2 border-white shadow-xl" /> : <div className="w-24 h-24 rounded-full bg-[#333] border-2 border-[#444]"></div>}
                <h2 className="text-4xl font-bold text-white tracking-tight">{decodeURIComponent(title)}</h2>
            </div>
            <div className="flex border-b border-[#333] mb-8">
                <button className={getTabClass('videos')} onClick={() => setActiveTab('videos')}>Videos</button>
                <button className={getTabClass('live')} onClick={() => setActiveTab('live')}>Live</button>
                <button className={getTabClass('playlists')} onClick={() => setActiveTab('playlists')}>Playlists</button>
            </div>
            {renderTabContent()}
        </div>
    );
}

function PlaylistGrid({ playlists, onPlaylistClick }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {playlists.map(pl => (
                <div key={pl.id} onClick={() => onPlaylistClick(pl.id, pl.snippet.title)} className="cursor-pointer group">
                    <div className="relative">
                        <img src={pl.snippet.thumbnails.medium.url} className="w-full aspect-video object-cover rounded-xl border border-transparent group-hover:border-[#444]" />
                        <div className="absolute bottom-2 right-2 bg-black/90 px-2 py-1 rounded text-xs font-bold text-white">{pl.contentDetails.itemCount} videos</div>
                    </div>
                    <p className="font-bold mt-3 line-clamp-1 text-gray-200 group-hover:text-white">{pl.snippet.title}</p>
                </div>
            ))}
        </div>
    );
}

function PlaylistPage() {
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('');
    const [searchParams] = useSearchParams();
    const playlistId = searchParams.get('id');
    const title = searchParams.get('title');
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => { if (playlistId && window.api) { setStatus('Loading playlist items...'); window.api.getPlaylistItems(playlistId).then(result => { if (result.success) { setItems(result.data); setStatus(''); } else { setStatus(`Error: ${result.error}`); } }); } }, [playlistId]);
    useGSAP(() => { if(items.length > 0) gsap.from(containerRef.current, { opacity: 0, x: 20, duration: 0.4 }); }, [items]);
    const onVideoClick = (videoId) => navigate(`/watch?v=${videoId}`);
    return (
        <div ref={containerRef}>
            <h2 className="text-3xl font-bold mb-6 text-white">{decodeURIComponent(title)}</h2>
            {status && <p className="text-gray-500">{status}</p>}
            <div className="flex flex-col gap-2">
                {items.map((item, index) => (item.snippet.thumbnails ? (
                    <div key={item.id} className="flex items-center p-3 rounded-xl hover:bg-[#1a1a1a] cursor-pointer transition-colors group border border-transparent hover:border-[#333]" onClick={() => onVideoClick(item.snippet.resourceId.videoId)}>
                        <span className="text-[#555] w-8 text-center group-hover:hidden font-mono text-sm">{index + 1}</span>
                        <span className="hidden w-8 text-center group-hover:block text-white">▶</span>
                        <img src={item.snippet.thumbnails.default.url} alt={item.snippet.title} className="w-32 aspect-video rounded-lg mr-4 object-cover border border-[#222]" />
                        <span className="text-lg font-medium line-clamp-1 text-gray-300 group-hover:text-white">{item.snippet.title}</span>
                    </div>
                ) : null))}
            </div>
        </div>
    );
}

function LibraryPage() {
    const [playlists, setPlaylists] = useState([]);
    const [status, setStatus] = useState('Loading...');
    const navigate = useNavigate();
    const containerRef = useRef(null);
    useEffect(() => { if (window.api) { window.api.getMyPlaylists().then(result => { if (result.success) { setPlaylists(result.data); setStatus(''); } else { setStatus(`Error: ${result.error}`); } }); } }, []);
    const handlePlaylist = (pid, ptitle) => navigate(`/playlist?id=${pid}&title=${encodeURIComponent(ptitle)}`);
    return (
        <div ref={containerRef}>
            <h2 className="text-3xl font-bold mb-6 text-white">Your Library</h2>
            {status && <p className="text-gray-500">{status}</p>}
            <PlaylistGrid playlists={playlists} onPlaylistClick={handlePlaylist} />
        </div>
    );
}

function SettingsPage() {
    const { autoplay, toggleAutoplay, sponsorBlockEnabled, toggleSponsorBlock } = useAppStore();
    const containerRef = useRef(null);
    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, y: 20, duration: 0.5 }); }, []);
    return (
        <div className="max-w-2xl" ref={containerRef}>
            <h2 className="text-3xl font-bold mb-6 text-white">Settings</h2>
            <div className="flex flex-col gap-4">
                <div className="bg-[#181818] p-6 rounded-xl flex items-center justify-between border border-[#333]">
                    <div><p className="font-bold text-lg text-white">Autoplay</p><p className="text-sm text-[#888]">Automatically play the next related video</p></div>
                    <button onClick={toggleAutoplay} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${autoplay ? 'bg-blue-600' : 'bg-[#333]'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoplay ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
                <div className="bg-[#181818] p-6 rounded-xl flex items-center justify-between border border-[#333]">
                    <div><p className="font-bold text-lg text-white">SponsorBlock</p><p className="text-sm text-[#888]">Automatically skip paid promotions and intros</p></div>
                    <button onClick={toggleSponsorBlock} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${sponsorBlockEnabled ? 'bg-purple-600' : 'bg-[#333]'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${sponsorBlockEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
            </div>
        </div>
    )
}

function DownloadModal({ videoInfo, videoId, onClose }) {
    const [videoFormats, setVideoFormats] = useState([]);
    const [audioFormats, setAudioFormats] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedAudio, setSelectedAudio] = useState('');
    const [downloadStatus, setDownloadStatus] = useState('');
    const modalRef = useRef(null);
    useGSAP(() => { gsap.from(modalRef.current, { scale: 0.9, opacity: 0, duration: 0.3, ease: "back.out(1.2)" }); }, []);
    useEffect(() => {
        const allFormats = videoInfo.formats || [];
        const videos = allFormats.filter(f => f.vcodec !== 'none' && f.acodec === 'none' && (f.ext === 'mp4' || f.ext === 'webm')).sort((a, b) => b.height - a.height);
        const audios = allFormats.filter(f => f.acodec !== 'none' && f.vcodec === 'none' && (f.ext === 'm4a' || f.ext === 'opus')).sort((a, b) => b.abr - a.abr);
        setVideoFormats(videos); setAudioFormats(audios);
        if (videos.length > 0) setSelectedVideo(videos[0].format_id);
        if (audios.length > 0) setSelectedAudio(audios[0].format_id);
    }, [videoInfo]);
    const handleDownload = () => {
        if (!selectedVideo || !selectedAudio) { setDownloadStatus('Please select both formats.'); return; }
        setDownloadStatus('Starting download...');
        window.api.startDownload(videoId, selectedVideo, selectedAudio).then(result => { if (result.success) setDownloadStatus('Download complete!'); else setDownloadStatus(`Failed: ${result.error}`); });
    };
    const formatSize = (bytes) => !bytes ? 'N/A' : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]" onClick={onClose}>
            <div ref={modalRef} className="bg-[#181818] p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-[#333]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Download Manager</h2><button onClick={onClose} className="text-[#777] hover:text-white"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg></button></div>
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-[#666] mb-2 uppercase tracking-wider">Video Stream</label>
                        <div className="h-64 overflow-y-auto bg-[#121212] rounded-xl border border-[#222] p-2 custom-scrollbar">
                            {videoFormats.map(f => {
                                const isHDR = f.dynamic_range && f.dynamic_range === 'HDR10' || f.dynamic_range === 'HLG';
                                return (
                                    <div key={f.format_id} onClick={() => setSelectedVideo(f.format_id)} className={`p-3 mb-1 rounded-lg text-sm cursor-pointer flex justify-between items-center transition-colors ${selectedVideo === f.format_id ? 'bg-blue-600 text-white' : 'hover:bg-[#222] text-[#ccc]'}`}>
                                        <div className="flex items-center gap-2"><span className="font-medium">{f.height}p</span>{isHDR ? <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-[10px] font-bold border border-yellow-500/50">HDR</span> : <span className="px-1.5 py-0.5 rounded bg-[#333] text-[#777] text-[10px] font-bold">SDR</span>}</div>
                                        <span className="opacity-60 text-xs">{formatSize(f.filesize || f.filesize_approx)}</span>
                                    </div>
                                )})}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#666] mb-2 uppercase tracking-wider">Audio Stream</label>
                        <div className="h-64 overflow-y-auto bg-[#121212] rounded-xl border border-[#222] p-2 custom-scrollbar">
                            {audioFormats.map(f => (
                                <div key={f.format_id} onClick={() => setSelectedAudio(f.format_id)} className={`p-3 mb-1 rounded-lg text-sm cursor-pointer flex justify-between items-center transition-colors ${selectedAudio === f.format_id ? 'bg-blue-600 text-white' : 'hover:bg-[#222] text-[#ccc]'}`}>
                                    <span className="font-medium">{f.abr}kbps ({f.ext})</span>
                                    <span className="opacity-60 text-xs">{formatSize(f.filesize || f.filesize_approx)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={handleDownload} disabled={!!downloadStatus} className="w-full bg-blue-600 h-12 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold text-lg transition-all text-white shadow-lg shadow-blue-900/20">{downloadStatus || 'Start Download'}</button>
            </div>
        </div>
    );
}

export default App;