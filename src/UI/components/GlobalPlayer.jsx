import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { categoryMap } from '../../categoryMap';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Hls from 'hls.js';
import DownloadModal from './DownloadModal';
import CommentsSection from './CommentsSection';
import { IconBadgeCc, IconBadgeCcFilled, IconLanguage } from '@tabler/icons-react';

function GlobalPlayer() {
    const { currentVideoId, isAudioMode, videoInfo, setVideoInfo, closeVideo, playVideo } = useAppStore();
    const { autoplay, sponsorBlockEnabled } = useAppStore();
    const setPipElement = useAppStore((state) => state.setPipElement);
    const clearPipElement = useAppStore((state) => state.clearPipElement);
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const playerContainerRef = useRef(null);

    const likeCountRef = useRef(null);
    const lastActionTime = useRef(0);

    const [playableUrl, setPlayableUrl] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [relatedShorts, setRelatedShorts] = useState([]);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [channelIcon, setChannelIcon] = useState(null);

    const [videoQualities, setVideoQualities] = useState([]);
    const [audioQualities, setAudioQualities] = useState([]);
    const [currentVideoLabel, setCurrentVideoLabel] = useState('AUTO');
    const [currentAudioLabel, setCurrentAudioLabel] = useState('AUTO');
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);

    // AUDIO LANGUAGE STATE
    const [audioTracks, setAudioTracks] = useState([]);
    const [currentLanguage, setCurrentLanguage] = useState('Default');
    const [showLangMenu, setShowLangMenu] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sponsorSegments, setSponsorSegments] = useState([]);
    const [showSkipToast, setShowSkipToast] = useState(false);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isModifyingSub, setIsModifyingSub] = useState(false);

    const [userRating, setUserRating] = useState('none');
    const [likeCount, setLikeCount] = useState(0);
    const [isRating, setIsRating] = useState(false);

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const descriptionRef = useRef(null);
    const [showExpandButton, setShowExpandButton] = useState(false);

    // SUBTITLES
    const [subtitles, setSubtitles] = useState([]);
    const [currentSubtitle, setCurrentSubtitle] = useState(null);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [subtitleTrackUrl, setSubtitleTrackUrl] = useState(null);

    const mediaRef = useRef(null);
    const audioRef = useRef(null);
    const hlsRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const historyAdded = useRef(false);

    const isWatchPage = location.pathname === '/watch';
    const hasVideo = !!currentVideoId;

    const langName = new Intl.DisplayNames(['en'], { type: 'language' });

    // GSAP Animation for Like Count
    useEffect(() => {
        if (likeCountRef.current) {
            const currentDisplay = parseFloat(likeCountRef.current.innerText.replace(/,/g, '')) || 0;
            const target = likeCount;
            const diff = Math.abs(target - currentDisplay);
            const duration = diff <= 1 ? 0.3 : 1.5;
            const startVal = { val: currentDisplay };

            gsap.to(startVal, {
                val: target,
                duration: duration,
                ease: "power1.out",
                onUpdate: () => {
                    if (likeCountRef.current) {
                        likeCountRef.current.innerText = Math.round(startVal.val).toLocaleString();
                    }
                }
            });

            if (diff === 1) {
                gsap.fromTo(likeCountRef.current.parentElement,
                    { scale: 1.1, color: '#a22c29' },
                    { scale: 1, color: userRating === 'like' ? '#a22c29' : '#b9baa3', duration: 0.2 }
                );
            }
        }
    }, [likeCount]);

    // Polling
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        if (!currentVideoId || !window.api.getVideoStats) return;

        const fetchStatsLoop = async () => {
            if (!isMounted) return;
            if (Date.now() - lastActionTime.current > 2000) {
                try {
                    const res = await window.api.getVideoStats(currentVideoId);
                    if (res.success && res.data && isMounted) {
                        const serverCount = parseInt(res.data.likeCount || 0);
                        if (!isNaN(serverCount)) {
                            setLikeCount(prev => {
                                if (prev !== serverCount) return serverCount;
                                return prev;
                            });
                        }
                    }
                } catch (e) {
                    console.error("Stats polling error", e);
                }
            }
            timeoutId = setTimeout(fetchStatsLoop, 500);
        };
        fetchStatsLoop();
        return () => { isMounted = false; if (timeoutId) clearTimeout(timeoutId); };
    }, [currentVideoId]);

    const handleAudioLanguageChange = (track) => {
        const time = mediaRef.current ? mediaRef.current.currentTime : 0;
        setAudioUrl(track.url);
        setCurrentLanguage(track.label);
        setShowLangMenu(false);
        setTimeout(() => {
            if(mediaRef.current) mediaRef.current.currentTime = time;
            if(audioRef.current) audioRef.current.currentTime = time;
        }, 50);
    };

    // Subtitle Logic
    const handleSubtitleChange = async (sub) => {
        setCurrentSubtitle(sub);
        setShowSubtitleMenu(false);

        if (subtitleTrackUrl) {
            URL.revokeObjectURL(subtitleTrackUrl);
            setSubtitleTrackUrl(null);
        }

        if (sub === null) return;

        try {
            const res = await window.api.getSubtitleContent(sub.url);
            if (res.success) {
                const blob = new Blob([res.data], { type: 'text/vtt' });
                const url = URL.createObjectURL(blob);
                setSubtitleTrackUrl(url);
            } else {
                console.error("Failed to fetch subtitle content", res.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const checkStatus = async (channelId) => {
        if (!window.api.checkSubscription) return;
        const res = await window.api.checkSubscription(channelId);
        if (res.success) {
            setIsSubscribed(res.data.isSubscribed);
        }
    };

    const checkRating = async (videoId) => {
        if (!window.api.getVideoRating) return;
        const rateRes = await window.api.getVideoRating(videoId);
        if (rateRes.success) {
            setUserRating(rateRes.data.rating);
        }
    };

    const handleRating = async (newRating) => {
        if (!currentVideoId || isRating) return;
        setIsRating(true);
        lastActionTime.current = Date.now();

        const previousRating = userRating;
        const finalRating = previousRating === newRating ? 'none' : newRating;
        let delta = 0;
        if (previousRating === 'like') delta -= 1;
        if (finalRating === 'like') delta += 1;

        setUserRating(finalRating);
        setLikeCount(prev => Math.max(0, prev + delta));

        try {
            const res = await window.api.rateVideo(currentVideoId, finalRating);
            if (!res.success) {
                setUserRating(previousRating);
                setLikeCount(prev => Math.max(0, prev - delta));
            }
        } catch (e) {
            setUserRating(previousRating);
            setLikeCount(prev => Math.max(0, prev - delta));
        }
        setIsRating(false);
    };

    const handleSubscribe = async (channelId) => {
        if (!channelId || !window.api.modifySubscription || isModifyingSub) return;
        setIsModifyingSub(true);
        const action = isSubscribed ? 'unsubscribe' : 'subscribe';
        try {
            const res = await window.api.modifySubscription(channelId, action);
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

    const parseDescription = (text) => {
        if (!text) return null;
        const parts = [];
        let key = 0;
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/;
        const combinedRegex = new RegExp(`(${urlRegex.source})|(${timestampRegex.source})`, 'g');
        const paragraphs = text.split('\n');
        paragraphs.forEach((paragraph, pIndex) => {
            let lastIndex = 0;
            const matches = [...paragraph.matchAll(combinedRegex)];
            matches.forEach(match => {
                const matchStart = match.index;
                const matchEnd = match.index + match[0].length;
                if (matchStart > lastIndex) {
                    parts.push(<span key={key++}>{paragraph.substring(lastIndex, matchStart)}</span>);
                }
                const segment = match[0];
                const isLink = !!match[1];
                const isTimestamp = !!match[3];
                if (isLink) {
                    parts.push(<a key={key++} href={segment} target="_blank" rel="noopener noreferrer" className="text-[#a22c29] hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>{segment}</a>);
                } else if (isTimestamp) {
                    const timeArray = segment.split(':').map(Number);
                    let seconds = 0;
                    if (timeArray.length === 3) {
                        seconds = timeArray[0] * 3600 + timeArray[1] * 60 + timeArray[2];
                    } else if (timeArray.length === 2) {
                        seconds = timeArray[0] * 60 + timeArray[1];
                    }
                    parts.push(<button key={key++} onClick={() => { if (mediaRef.current) mediaRef.current.currentTime = seconds; if (audioRef.current) audioRef.current.currentTime = seconds; }} className="text-[#a22c29] hover:underline transition-colors font-bold">{segment}</button>);
                }
                lastIndex = matchEnd;
            });
            if (lastIndex < paragraph.length) {
                parts.push(<span key={key++}>{paragraph.substring(lastIndex)}</span>);
            }
            if (pIndex < paragraphs.length - 1) {
                parts.push(<br key={key++} />);
                parts.push(<br key={key++} />);
            }
        });
        return parts;
    };

    useEffect(() => {
        if (isLive) return;
        const video = mediaRef.current;
        const audio = audioRef.current;
        const sync = () => {
            if (!video || !audio) return;
            if (Math.abs(video.currentTime - audio.currentTime) > 0.25) audio.currentTime = video.currentTime;
            if (video.paused !== audio.paused) video.paused ? audio.pause() : audio.play().catch(() => {});
            if (video.playbackRate !== audio.playbackRate) audio.playbackRate = video.playbackRate;
            if (audio.volume !== volume) audio.volume = volume;
        };
        const interval = setInterval(sync, 200);
        return () => clearInterval(interval);
    }, [playableUrl, audioUrl, volume, isLive]);

    useGSAP(() => {
        if (hasVideo && !isWatchPage) {
            gsap.fromTo(containerRef.current, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power4.out" });
        }
    }, [hasVideo, isWatchPage]);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        let cleanupHls = () => {};

        if (currentVideoId && window.api) {
            historyAdded.current = false;
            setRelatedVideos([]);
            setRelatedShorts([]);
            setChannelIcon(null);
            setVideoQualities([]);
            setAudioQualities([]);
            setSponsorSegments([]);
            setPlayableUrl(null);
            setAudioUrl(null);
            setIsLive(false);
            setCurrentVideoLabel('AUTO');
            setCurrentAudioLabel('AUTO');
            setIsDescriptionExpanded(false);
            setUserRating('none');
            setLikeCount(0);
            setSubtitles([]);
            setCurrentSubtitle(null);
            setSubtitleTrackUrl(null);
            setAudioTracks([]);
            setCurrentLanguage('Default');

            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
            if (sponsorBlockEnabled) window.api.getSponsorSegments(currentVideoId).then(res => res.success && setSponsorSegments(res.data));
            checkRating(currentVideoId);

            window.api.getFormats(currentVideoId).then(result => {
                if (result.success) {
                    const data = result.data;
                    setVideoInfo(data);

                    const rawFormats = data.formats || [];
                    const uniqueLanguages = new Map();
                    rawFormats.forEach(f => {
                        if (f.vcodec === 'none' && f.acodec !== 'none') {
                            const langCode = f.language || 'unknown';
                            if (!uniqueLanguages.has(langCode) || (f.abr > uniqueLanguages.get(langCode).abr)) {
                                uniqueLanguages.set(langCode, f);
                            }
                        }
                    });
                    const tracks = Array.from(uniqueLanguages.values()).map(f => {
                        let label = 'Unknown';
                        if (f.language) {
                            try { label = langName.of(f.language).toUpperCase(); } catch (e) { label = f.language.toUpperCase(); }
                        } else {
                            label = 'ORIGINAL';
                        }
                        return { label, url: f.url, lang: f.language, ...f };
                    }).sort((a, b) => a.label.localeCompare(b.label));
                    setAudioTracks(tracks);

                    const subs = [];
                    if (data.subtitles) {
                        Object.entries(data.subtitles).forEach(([lang, formats]) => {
                            const vtt = formats.find(f => f.ext === 'vtt');
                            if (vtt) subs.push({ lang, url: vtt.url, label: `${lang.toUpperCase()} (Manual)` });
                        });
                    }
                    if (data.automatic_captions) {
                        Object.entries(data.automatic_captions).forEach(([lang, formats]) => {
                            const vtt = formats.find(f => f.ext === 'vtt');
                            if (vtt) subs.push({ lang, url: vtt.url, label: `${lang.toUpperCase()} (Auto)` });
                        });
                    }
                    setSubtitles(subs);

                    const isLiveStream = data.is_live === true || data.live_status === 'is_live';

                    if (isLiveStream) {
                        setIsLive(true);
                        let masterUrl = data.manifest_url || data.hls_manifest_url;
                        if (!masterUrl && data.formats) {
                            const masterFormat = data.formats.find(f => f.url && f.url.includes('master.m3u8'));
                            if (masterFormat) masterUrl = masterFormat.url;
                        }
                        if (!masterUrl && data.url && (data.url.includes('.m3u8') || data.protocol === 'm3u8')) masterUrl = data.url;
                        if (!masterUrl && data.formats) {
                            const hlsFormats = data.formats.filter(f => f.protocol === 'm3u8' || f.ext === 'm3u8');
                            if (hlsFormats.length > 0) {
                                hlsFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
                                masterUrl = hlsFormats[0].url;
                            }
                        }
                        setPlayableUrl(masterUrl);
                        setCurrentVideoLabel('AUTO');
                    } else {
                        const vOpts = rawFormats.filter(f => f.vcodec !== 'none').sort((a, b) => (b.height || 0) - (a.height || 0));
                        const uniqueV = []; const seenV = new Set();
                        vOpts.forEach(f => {
                            if (!f.height) return;
                            const isHDR = f.dynamic_range === 'HDR10' || f.dynamic_range === 'HLG';
                            const label = `${f.height}p${isHDR ? ' HDR' : ''}`;
                            const key = label + f.url;
                            if(!seenV.has(key)) { seenV.add(key); uniqueV.push({ label, url: f.url, ...f }); }
                        });
                        setVideoQualities(uniqueV);

                        const aOpts = rawFormats.filter(f => f.acodec !== 'none' && f.vcodec === 'none').sort((a, b) => (b.abr || 0) - (a.abr || 0));
                        const uniqueA = [];
                        aOpts.forEach(f => { if(!f.abr) return; uniqueA.push({ label: `${f.abr.toFixed(0)}kbps`, url: f.url, ...f }); });
                        setAudioQualities(uniqueA);

                        if (isAudioMode) {
                            const bestAudio = uniqueA[0];
                            if(bestAudio) { setAudioUrl(bestAudio.url); setCurrentAudioLabel(bestAudio.label); }
                        } else {
                            const bestVideo = uniqueV[0];
                            const bestAudio = uniqueA[0];
                            if (bestVideo) {
                                setPlayableUrl(bestVideo.url);
                                setCurrentVideoLabel(bestVideo.label);
                                if (bestVideo.acodec !== 'none') { setAudioUrl(null); setCurrentAudioLabel('EMBEDDED'); }
                                else { setAudioUrl(bestAudio ? bestAudio.url : null); if(bestAudio) setCurrentAudioLabel(bestAudio.label); }
                            } else { setPlayableUrl(data.url); }
                        }
                    }
                    if (data.channel_id) {
                        window.api.getChannelIcon(data.channel_id).then(iconRes => {
                            if (iconRes.success) {
                                if (typeof iconRes.data === 'object' && iconRes.data !== null && iconRes.data.icon) {
                                    setChannelIcon(iconRes.data.icon);
                                } else if (typeof iconRes.data === 'string') {
                                    setChannelIcon(iconRes.data);
                                }
                            }
                        });
                        checkStatus(data.channel_id);
                    }
                    const catName = data.categories ? data.categories[0] : 'Unknown';
                    const catId = categoryMap[catName] || null;
                    if (!historyAdded.current) { window.api.addHistory(currentVideoId, data.title, data.uploader, data.channel_id, catId, catName); historyAdded.current = true; }
                    if (catId) window.api.getTrendingByCategory(catId).then(rec => {
                        if(rec.success) {
                            const s = rec.data.filter(v => v.id !== currentVideoId && v.snippet.title.toLowerCase().includes('#shorts'));
                            const v = rec.data.filter(v => v.id !== currentVideoId && !v.snippet.title.toLowerCase().includes('#shorts'));
                            setRelatedShorts(s);
                            setRelatedVideos(v);
                        }
                    });
                }
            });
        }
        return cleanupHls;
    }, [currentVideoId, setVideoInfo, sponsorBlockEnabled, isAudioMode]);

    useEffect(() => {
        const el = mediaRef.current;
        if (!el) return;

        let hlsCleanup = () => {};

        if (isLive && playableUrl && Hls.isSupported()) {
            if (hlsRef.current) hlsRef.current.destroy();
            hlsRef.current = new Hls();
            hlsRef.current.loadSource(playableUrl);
            hlsRef.current.attachMedia(el);

            hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hlsRef.current.levels.map((level, index) => ({
                    label: level.height ? `${level.height}p` : 'Unknown',
                    url: playableUrl,
                    index: index,
                    height: level.height || 0
                })).sort((a, b) => b.height - a.height);
                setVideoQualities(levels);
                const audioTracks = hlsRef.current.audioTracks.map((track, index) => ({
                    label: track.name,
                    url: playableUrl,
                    index: index,
                }));
                setAudioQualities(audioTracks);
                el.play().catch(console.warn);
            });
            hlsCleanup = () => {
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
            };
        } else if (playableUrl && !isLive) {
            el.src = playableUrl;
            el.playbackRate = playbackRate;
            el.play().catch(console.warn);
        }

        const updateTime = () => {
            setCurrentTime(el.currentTime);
            if (!isLive && sponsorBlockEnabled && sponsorSegments.length > 0) {
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
            hlsCleanup();
            el.removeEventListener('timeupdate', updateTime);
            el.removeEventListener('loadedmetadata', updateDuration);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('enterpictureinpicture', onEnterPiP);
            el.removeEventListener('leavepictureinpicture', onLeavePiP);
            clearPipElement();
        };
    }, [playableUrl, isLive, sponsorBlockEnabled, sponsorSegments, playbackRate]);

    useEffect(() => { if (mediaRef.current) mediaRef.current.playbackRate = playbackRate; if (audioRef.current) audioRef.current.playbackRate = playbackRate; }, [playbackRate]);

    const togglePlay = (e) => { e?.stopPropagation(); if (mediaRef.current) mediaRef.current.paused ? mediaRef.current.play() : mediaRef.current.pause(); };
    const handleSeek = (e) => { if (isLive) return; const seekTime = parseFloat(e.target.value); if (mediaRef.current) mediaRef.current.currentTime = seekTime; if (audioRef.current) audioRef.current.currentTime = seekTime; setCurrentTime(seekTime); };
    const handleVolume = (e) => { const val = parseFloat(e.target.value); setVolume(val); if (isLive) { if (mediaRef.current) mediaRef.current.volume = val; } else { if (audioRef.current) audioRef.current.volume = val; else if (mediaRef.current) mediaRef.current.volume = val; } };
    const toggleFullscreen = (e) => { e?.stopPropagation(); if (!playerContainerRef.current) return; !document.fullscreenElement ? (playerContainerRef.current.requestFullscreen(), setIsFullscreen(true)) : (document.exitFullscreen(), setIsFullscreen(false)); };
    const handleQualityChange = (q) => { setCurrentVideoLabel(q.label); if (isLive && hlsRef.current) { hlsRef.current.currentLevel = q.index; } else { const time = mediaRef.current ? mediaRef.current.currentTime : 0; setPlayableUrl(q.url); if (q.acodec && q.acodec !== 'none') { setAudioUrl(null); setCurrentAudioLabel('EMBEDDED'); } else { if (!audioUrl && audioQualities.length > 0) { setAudioUrl(audioQualities[0].url); setCurrentAudioLabel(audioQualities[0].label); } } setTimeout(() => { if(mediaRef.current) mediaRef.current.currentTime = time; }, 50); } setShowQualityMenu(false); };
    const handleAudioQualityChange = (q) => { setCurrentAudioLabel(q.label); if (isLive && hlsRef.current) { hlsRef.current.audioTrack = q.index; } else { setAudioUrl(q.url); } setShowAudioMenu(false); };
    const handleMouseMove = () => { setShowControls(true); if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); controlsTimeoutRef.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 3000); };
    const handleVideoEnd = () => { if (!isLive && autoplay && relatedVideos.length > 0) { playVideo(relatedVideos[0].id, isAudioMode); if (isWatchPage) navigate(`/watch?v=${relatedVideos[0].id}`); } };
    const maximizePlayer = () => { if (!isWatchPage) navigate(`/watch?v=${currentVideoId}${isAudioMode ? '&audio=true' : ''}`); };
    const handleMiniPlayer = async (e) => { e?.stopPropagation(); if (!mediaRef.current) return; if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await mediaRef.current.requestPictureInPicture(); };

    if (!hasVideo) return null;

    const containerClass = isWatchPage ? "absolute inset-0 z-50 bg-[#0a100d] flex overflow-hidden" : "fixed bottom-6 right-6 w-[480px] bg-[#18181b] rounded-2xl shadow-2xl shadow-black z-[100] border border-[#b9baa3]/20 flex flex-col overflow-hidden transition-all duration-500 hover:shadow-[#a22c29]/10 hover:border-[#a22c29]/40 group/mini";
    const wrapperClass = isWatchPage ? "flex-1 flex flex-col p-0 md:p-4 overflow-y-auto custom-scrollbar" : "w-full flex-col";
    const videoContainerClass = isWatchPage ? "w-full max-w-[1600px] mx-auto" : "w-full";
    const videoAspectRatioClass = isWatchPage ? "relative bg-black rounded-xl overflow-hidden aspect-video border border-[#b9baa3]/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5" : "relative w-full aspect-video bg-black group";

    return (
        <div className={containerClass} ref={containerRef}>
            {showDownloadModal && videoInfo && <DownloadModal videoInfo={videoInfo} videoId={currentVideoId} onClose={() => setShowDownloadModal(false)} />}
            {showSkipToast && <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-[#a22c29] text-[#d6d5c9] px-4 py-1 rounded-sm shadow-[0_0_15px_rgba(162,44,41,0.6)] z-[60] font-mono text-xs font-bold uppercase tracking-widest border border-white/10">Ad Segment Neutralized</div>}
            {!isWatchPage && <button onClick={(e) => { e.stopPropagation(); closeVideo(); }} className="absolute top-2 right-2 bg-black/40 hover:bg-[#a22c29] text-white rounded p-1 transition-colors z-30 backdrop-blur-sm"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>}

            <div className={wrapperClass}>
                <div className={videoContainerClass}>
                    <div ref={playerContainerRef} className={videoAspectRatioClass} onMouseMove={isWatchPage ? handleMouseMove : undefined} onMouseLeave={isWatchPage ? () => isPlaying && setShowControls(false) : undefined} onDoubleClick={isWatchPage ? toggleFullscreen : undefined} onClick={!isWatchPage ? maximizePlayer : undefined}>
                        <div className={`absolute inset-0 bg-[#0a100d] flex items-center justify-center z-0 ${isAudioMode ? 'block' : 'hidden'}`}>
                            <img src={videoInfo?.thumbnail} className={`object-cover opacity-30 saturate-0 mix-blend-overlay ${isWatchPage ? 'h-full w-full absolute' : 'w-full h-full'}`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_0%,_#0a100d_100%)]"></div>
                            {!isWatchPage && <div className="absolute inset-0 flex items-center justify-center z-20"><div className="w-16 h-16 rounded-full border border-[#a22c29] flex items-center justify-center animate-pulse"><span className="text-2xl text-[#a22c29]">♪</span></div></div>}
                        </div>

                        <video key={currentVideoId} ref={mediaRef} className={`w-full h-full object-contain relative z-10 ${isAudioMode ? 'opacity-0' : 'opacity-100'}`} autoPlay onClick={isWatchPage ? togglePlay : undefined} onEnded={handleVideoEnd} muted={!!audioUrl && !isAudioMode}>
                            {subtitleTrackUrl && <track kind="subtitles" src={subtitleTrackUrl} default />}
                        </video>
                        {!isLive && audioUrl && <audio ref={audioRef} src={audioUrl} autoPlay />}

                        {isWatchPage && (
                            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a100d] via-[#0a100d]/90 to-transparent px-8 pb-8 pt-32 transition-opacity duration-300 z-20 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="relative w-full h-0.5 bg-[#b9baa3]/20 cursor-pointer group/bar mb-6 hover:h-1.5 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                                    {sponsorSegments.map(seg => { const start = (seg.segment[0] / duration) * 100; const width = ((seg.segment[1] - seg.segment[0]) / duration) * 100; return <div key={seg.UUID} className="absolute top-0 h-full bg-[#b9baa3]/60 z-10 pointer-events-none" style={{ left: `${start}%`, width: `${width}%` }} /> })}
                                    <div className="absolute top-0 left-0 h-full bg-[#a22c29] z-20 pointer-events-none shadow-[0_0_10px_#a22c29]" style={{ width: `${(currentTime / duration) * 100}%` }} />
                                    <div className="absolute top-1/2 -translate-y-1/2 -ml-1 w-3 h-3 bg-[#d6d5c9] shadow-[0_0_10px_#a22c29] rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-40" style={{ left: `${(currentTime / duration) * 100}%` }}></div>
                                    <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" disabled={isLive} />
                                </div>

                                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-8">
                                        <button onClick={togglePlay} className="text-[#d6d5c9] hover:text-[#a22c29] transition-colors scale-100 hover:scale-110 active:scale-95 duration-200">
                                            {isPlaying ? <svg width="42" height="42" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="42" height="42" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                        </button>
                                        <div className="flex items-center gap-3 group/vol">
                                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-[#b9baa3]"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                            <div className="w-24 h-1 bg-[#b9baa3]/20 relative rounded overflow-hidden">
                                                <div className="absolute top-0 left-0 h-full bg-[#d6d5c9]" style={{width: `${volume * 100}%`}}></div>
                                                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-[#b9baa3] tracking-widest">{formatTime(currentTime)} <span className="text-[#a22c29] mx-1">/</span> {isLive ? 'LIVE' : formatTime(duration)}</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* AUDIO LANGUAGE BUTTON */}
                                        {audioTracks.length > 0 && (
                                            <div className="relative">
                                                <button onClick={() => setShowLangMenu(!showLangMenu)} className={`p-2 rounded border transition-all ${currentLanguage !== 'Default' ? 'bg-[#a22c29] border-[#a22c29] text-white' : 'bg-transparent border-[#b9baa3]/30 text-[#b9baa3] hover:border-[#d6d5c9]'}`}>
                                                    <IconLanguage size={20} stroke={1.5} />
                                                </button>
                                                {showLangMenu && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)}></div>
                                                        <div className="absolute bottom-full right-0 mb-4 bg-[#0a100d]/95 border border-[#b9baa3]/20 backdrop-blur-xl rounded p-1 z-50 min-w-[140px] shadow-2xl flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                                                            {audioTracks.map((track, idx) => (
                                                                <button key={idx} onClick={() => handleAudioLanguageChange(track)} className={`block w-full text-left px-4 py-2 text-[10px] font-mono tracking-wider uppercase hover:bg-[#a22c29] hover:text-white transition-colors ${currentLanguage === track.label ? 'text-[#a22c29] font-bold' : 'text-[#b9baa3]'}`}>
                                                                    {track.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* CC BUTTON */}
                                        <div className="relative">
                                            <button onClick={() => setShowSubtitleMenu(!showSubtitleMenu)} className={`p-2 rounded border transition-all ${currentSubtitle ? 'bg-[#a22c29] border-[#a22c29] text-white' : 'bg-transparent border-[#b9baa3]/30 text-[#b9baa3] hover:border-[#d6d5c9]'}`}>
                                                {currentSubtitle ? <IconBadgeCcFilled size={20} /> : <IconBadgeCc size={20} stroke={1.5} />}
                                            </button>
                                            {showSubtitleMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowSubtitleMenu(false)}></div>
                                                    <div className="absolute bottom-full right-0 mb-4 bg-[#0a100d]/95 border border-[#b9baa3]/20 backdrop-blur-xl rounded p-1 z-50 min-w-[140px] shadow-2xl flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                                                        <button onClick={() => handleSubtitleChange(null)} className={`block w-full text-left px-4 py-2 text-[10px] font-mono tracking-wider uppercase hover:bg-[#a22c29] hover:text-white transition-colors ${!currentSubtitle ? 'text-[#a22c29] font-bold' : 'text-[#b9baa3]'}`}>Off</button>
                                                        {subtitles.map((sub, idx) => (
                                                            <button key={idx} onClick={() => handleSubtitleChange(sub)} className={`block w-full text-left px-4 py-2 text-[10px] font-mono tracking-wider uppercase hover:bg-[#a22c29] hover:text-white transition-colors ${currentSubtitle?.url === sub.url ? 'text-[#a22c29] font-bold' : 'text-[#b9baa3]'}`}>
                                                                {sub.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* VIDEO QUALITY BUTTON */}
                                        <div className="relative">
                                            <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="text-[10px] font-bold bg-[#b9baa3]/10 border border-[#b9baa3]/20 text-[#d6d5c9] px-3 py-1 rounded hover:bg-[#b9baa3]/20 hover:border-[#d6d5c9]/50 transition-all min-w-[60px] uppercase tracking-wider">{currentVideoLabel}</button>
                                            {showQualityMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowQualityMenu(false)}></div>
                                                    <div className="absolute bottom-full right-0 mb-4 bg-[#0a100d]/95 border border-[#b9baa3]/20 backdrop-blur-xl rounded p-1 z-50 min-w-[120px] shadow-2xl flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                                                        {videoQualities.map(q => <button key={q.label + (q.index || q.url)} onClick={() => handleQualityChange(q)} className={`block w-full text-left px-4 py-2 text-[10px] font-mono tracking-wider uppercase hover:bg-[#a22c29] hover:text-white transition-colors ${currentVideoLabel === q.label ? 'text-[#a22c29] font-bold hover:text-white' : 'text-[#b9baa3]'}`}>{q.label}</button>)}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* AUDIO QUALITY BUTTON */}
                                        <div className="relative">
                                            <button onClick={() => setShowAudioMenu(!showAudioMenu)} className="text-[10px] font-bold bg-[#b9baa3]/10 border border-[#b9baa3]/20 text-[#d6d5c9] px-3 py-1 rounded hover:bg-[#b9baa3]/20 hover:border-[#d6d5c9]/50 transition-all min-w-[60px] uppercase tracking-wider max-w-[100px] truncate">{currentAudioLabel}</button>
                                            {showAudioMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowAudioMenu(false)}></div>
                                                    <div className="absolute bottom-full right-0 mb-4 bg-[#0a100d]/95 border border-[#b9baa3]/20 backdrop-blur-xl rounded p-1 z-50 min-w-[120px] shadow-2xl flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                                                        {audioQualities.map(q => <button key={q.label + (q.index || q.url)} onClick={() => handleAudioQualityChange(q)} className={`block w-full text-left px-4 py-2 text-[10px] font-mono tracking-wider uppercase hover:bg-[#a22c29] hover:text-white transition-colors ${currentAudioLabel === q.label ? 'text-[#a22c29] font-bold hover:text-white' : 'text-[#b9baa3]'}`}>{q.label}</button>)}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <button onClick={handleMiniPlayer} className="text-[#b9baa3] hover:text-white transition-colors"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg></button>
                                        <button onClick={toggleFullscreen} className="text-[#b9baa3] hover:text-white transition-colors"><svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {isWatchPage && (
                        <div className="mt-6 px-4">
                            <h1 className="text-3xl font-bold leading-tight text-[#d6d5c9] font-sans tracking-tight">{videoInfo?.title || 'LOADING DATA...'}</h1>

                            <div className="flex justify-between items-center mt-6 pb-6 border-b border-[#b9baa3]/10">

                                <div className="flex items-center justify-start gap-4">
                                    <Link to={`/channel?id=${videoInfo?.channel_id}&title=${encodeURIComponent(videoInfo?.uploader)}`} className="flex items-center gap-4 group p-2 -ml-2 rounded hover:bg-[#b9baa3]/5 transition-all flex-shrink-0">
                                        {channelIcon ? <img src={channelIcon} className="w-12 h-12 rounded shadow-lg border border-[#b9baa3]/20 transition-all" /> : <div className="w-12 h-12 rounded bg-[#b9baa3]/20"></div>}
                                        <div>
                                            <p className="text-lg font-bold text-[#d6d5c9] group-hover:text-[#a22c29] transition-colors font-mono tracking-tight">{videoInfo?.uploader}</p>
                                            <span className="text-[10px] text-[#b9baa3]/60 uppercase tracking-widest">Verified Channel</span>
                                        </div>
                                    </Link>

                                    <button
                                        onClick={() => handleSubscribe(videoInfo?.channel_id)}
                                        disabled={isModifyingSub || !videoInfo?.channel_id}
                                        className={`
                                            text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-all duration-200
                                            ${isModifyingSub || !videoInfo?.channel_id ? 'bg-[#b9baa3]/20 text-[#b9baa3]/80 cursor-wait' : isSubscribed
                                            ? 'bg-[#b9baa3]/10 text-[#b9baa3] border border-[#b9baa3]/30 hover:bg-[#a22c29] hover:text-white'
                                            : 'bg-[#a22c29] text-white border border-[#a22c29] hover:bg-white hover:text-[#a22c29]'
                                        }
                                        `}
                                    >
                                        {isModifyingSub ? '...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                                    </button>
                                </div>

                                <div className="flex gap-4 items-center">
                                    {/* LIKE BUTTON WITH COUNT */}
                                    <div className="flex items-center bg-[#0a100d] border border-[#b9baa3]/20 rounded-full overflow-hidden group/likes">
                                        <button
                                            onClick={() => handleRating('like')}
                                            disabled={isRating}
                                            className={`pl-4 pr-3 py-2.5 flex items-center gap-2 transition-all hover:bg-[#a22c29]/10 ${userRating === 'like' ? 'text-[#a22c29] font-bold' : 'text-[#b9baa3] hover:text-[#a22c29]'}`}
                                        >
                                            <svg width="18" height="18" fill={userRating === 'like' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                            <span ref={likeCountRef} className="text-xs font-mono tabular-nums">{Number(likeCount).toLocaleString()}</span>
                                        </button>
                                        <div className="w-px h-6 bg-[#b9baa3]/20"></div>
                                        <button
                                            onClick={() => handleRating('dislike')}
                                            disabled={isRating}
                                            className={`pr-4 pl-3 py-2.5 flex items-center transition-all hover:bg-[#a22c29]/10 ${userRating === 'dislike' ? 'text-[#a22c29] font-bold' : 'text-[#b9baa3] hover:text-[#a22c29]'}`}
                                        >
                                            <svg width="18" height="18" fill={userRating === 'dislike' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                        </button>
                                    </div>

                                    <select value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="bg-[#0a100d] text-[#b9baa3] text-xs px-4 py-3 rounded border border-[#b9baa3]/20 outline-none focus:border-[#a22c29] appearance-none cursor-pointer font-mono uppercase tracking-wider hover:bg-[#b9baa3]/5 transition-all"><option value="0.5">0.5x</option><option value="1">1x Speed</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select>
                                    <button onClick={() => setShowDownloadModal(true)} disabled={isLive} className={`bg-[#d6d5c9] text-[#0a100d] px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#a22c29] hover:text-white hover:shadow-[0_0_20px_#a22c29] ${isLive ? 'opacity-50 cursor-not-allowed' : ''}`}>{isLive ? 'LIVE STREAM' : 'DOWNLOAD'}</button>
                                </div>
                            </div>

                            {videoInfo?.description && (
                                <div className="mt-6 p-4 rounded-xl bg-[#b9baa3]/5 border border-[#b9baa3]/10 text-xs text-[#d6d5c9] font-mono">
                                    <div
                                        ref={descriptionRef}
                                        className={`transition-all duration-300 overflow-hidden ${isDescriptionExpanded ? 'max-h-full' : 'max-h-12'}`}
                                    >
                                        {parseDescription(videoInfo.description)}
                                    </div>

                                    {showExpandButton && (
                                        <button
                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                            className="mt-2 text-[#a22c29] font-bold text-[11px] uppercase hover:underline"
                                        >
                                            {isDescriptionExpanded ? 'Show Less' : 'Show More'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <CommentsSection key={currentVideoId} videoId={currentVideoId} />

                        </div>
                    )}
                </div>
            </div>
            {isWatchPage && (
                <div className="w-[400px] bg-[#0a100d] border-l border-[#b9baa3]/10 overflow-y-auto p-6 hidden xl:block custom-scrollbar">
                    {relatedShorts.length > 0 && (
                        <div className="mb-6 pb-6 border-b border-[#b9baa3]/10">
                            <h3 className="text-xs font-bold mb-4 text-[#b9baa3]/60 uppercase tracking-[0.2em]">Related Shorts</h3>
                            <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
                                {relatedShorts.map(s => (
                                    <div key={s.id} onClick={() => navigate(`/watch?v=${s.id}`)} className="flex-shrink-0 w-[100px] aspect-[9/16] relative rounded overflow-hidden cursor-pointer border border-[#b9baa3]/10 hover:border-[#a22c29] transition-all snap-start">
                                        <img src={s.snippet.thumbnails.medium.url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <p className="absolute bottom-2 left-2 right-2 text-[9px] font-bold text-white line-clamp-2 leading-tight">{s.snippet.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <h3 className="text-xs font-bold mb-6 text-[#b9baa3]/60 uppercase tracking-[0.2em] border-b border-[#b9baa3]/10 pb-2">Queue</h3>
                    <div className="flex flex-col gap-4">{relatedVideos.map(v => (
                        <div key={v.id} onClick={() => { playVideo(v.id, isAudioMode); navigate(`/watch?v=${v.id}${isAudioMode ? '&audio=true' : ''}`) }} className="flex gap-4 cursor-pointer hover:bg-[#b9baa3]/5 p-2 rounded transition-all group">
                            <div className="relative flex-shrink-0 overflow-hidden rounded w-32 aspect-video border border-[#b9baa3]/10 group-hover:border-[#a22c29]/50 transition-colors"><img src={v.snippet.thumbnails.default.url} className="w-full h-full object-cover transition-all duration-500" /></div>
                            <div className="flex-1 min-w-0 pt-1"><p className="text-xs font-bold line-clamp-2 text-[#d6d5c9] leading-relaxed group-hover:text-[#a22c29] transition-colors">{v.snippet.title}</p><p className="text-[10px] text-[#b9baa3]/60 mt-2 font-mono uppercase">{v.snippet.channelTitle}</p></div>
                        </div>
                    ))}</div>
                </div>
            )}
            {!isWatchPage && (
                <div className="p-4 bg-[#0a100d] border-t border-[#b9baa3]/10 flex justify-between items-center cursor-pointer hover:bg-[#b9baa3]/5 transition-colors" onClick={maximizePlayer}>
                    <div className="truncate flex-1 pr-4"><p className="text-xs font-bold truncate text-[#d6d5c9] font-mono">{videoInfo?.title || 'WAITING FOR INPUT...'}</p><p className="text-[10px] text-[#a22c29] font-bold uppercase tracking-widest mt-1">{videoInfo?.uploader}</p></div>
                    {isAudioMode && <span className="text-[8px] bg-[#a22c29]/10 text-[#a22c29] px-2 py-1 rounded border border-[#a22c29]/20 font-mono font-bold tracking-widest">AUDIO ONLY</span>}
                </div>
            )}
        </div>
    );
}
export default GlobalPlayer;