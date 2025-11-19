import { useState, useEffect, useRef } from 'react';

function CommentItem({ item }) {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const [showReplies, setShowReplies] = useState(false);
    const [replies, setReplies] = useState([]);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);

    const snippet = item.snippet.topLevelComment ? item.snippet.topLevelComment.snippet : item.snippet;
    const commentId = item.snippet.topLevelComment ? item.id : item.id;
    const replyCount = item.snippet.totalReplyCount || 0;

    const [likeCount, setLikeCount] = useState(snippet.likeCount || 0);
    const [userLiked, setUserLiked] = useState(false);

    const handleLike = async () => {
        if (userLiked) return;
        try {
            const res = await window.api.rateComment(commentId, 'like');
            if (res.success) {
                setLikeCount(prev => prev + 1);
                setUserLiked(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleReplySubmit = async () => {
        if (!replyText.trim() || isReplying) return;
        setIsReplying(true);
        try {
            const res = await window.api.replyToComment(commentId, replyText);
            if (res.success) {
                setReplies(prev => [...prev, res.data]);
                setReplyText('');
                setShowReplyInput(false);
                setShowReplies(true);
            } else {
                alert('Error: ' + res.error);
            }
        } catch(e) {
            alert('Error: ' + e.message);
        }
        setIsReplying(false);
    };

    const toggleReplies = async () => {
        if (showReplies) {
            setShowReplies(false);
        } else {
            setShowReplies(true);
            if (replies.length === 0 && replyCount > 0) {
                setIsLoadingReplies(true);
                try {
                    const res = await window.api.getReplies(commentId);
                    if (res.success) {
                        setReplies(res.data);
                    }
                } catch (e) {
                    console.error(e);
                }
                setIsLoadingReplies(false);
            }
        }
    };

    return (
        <div className="flex gap-4 group animate-in fade-in slide-in-from-top-2 duration-300">
            <img src={snippet.authorProfileImageUrl} alt="" className="w-8 h-8 rounded-full border border-[#b9baa3]/20 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#a22c29] font-bold text-xs font-mono uppercase hover:underline cursor-pointer truncate">{snippet.authorDisplayName}</span>
                    <span className="text-[#b9baa3]/40 text-[10px] font-mono flex-shrink-0">{new Date(snippet.publishedAt).toLocaleDateString()} {new Date(snippet.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-[#d6d5c9] text-sm leading-relaxed font-sans whitespace-pre-wrap break-words">{snippet.textOriginal}</p>

                <div className="flex items-center gap-4 mt-2 text-[#b9baa3]/40 text-[10px] font-mono">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1 hover:text-[#a22c29] cursor-pointer transition-colors ${userLiked ? 'text-[#a22c29] font-bold' : ''}`}
                    >
                        ▲ {likeCount}
                    </button>
                    <button onClick={() => setShowReplyInput(!showReplyInput)} className="hover:text-[#d6d5c9] cursor-pointer uppercase">REPLY</button>

                    {replyCount > 0 && (
                        <button onClick={toggleReplies} className="hover:text-[#a22c29] cursor-pointer uppercase text-[#a22c29]/80">
                            {showReplies ? 'HIDE REPLIES' : `VIEW ${replyCount} REPLIES`}
                        </button>
                    )}
                </div>

                {showReplyInput && (
                    <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="ENTER RESPONSE..."
                            className="flex-1 bg-[#0a100d] border border-[#b9baa3]/20 rounded p-2 text-xs font-mono text-[#d6d5c9] focus:border-[#a22c29] outline-none"
                            autoFocus
                        />
                        <button
                            onClick={handleReplySubmit}
                            disabled={isReplying}
                            className="bg-[#b9baa3]/10 hover:bg-[#a22c29] text-[#d6d5c9] hover:text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all border border-[#b9baa3]/20"
                        >
                            {isReplying ? '...' : 'POST'}
                        </button>
                    </div>
                )}

                {showReplies && (
                    <div className="mt-4 pl-4 border-l-2 border-[#b9baa3]/10 space-y-4">
                        {isLoadingReplies ? (
                            <div className="text-[#b9baa3]/40 font-mono text-[10px] animate-pulse">LOADING THREAD...</div>
                        ) : (
                            replies.map(reply => <CommentItem key={reply.id} item={reply} />)
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function CommentsSection({ videoId }) {
    const [comments, setComments] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [isLiveMode, setIsLiveMode] = useState(false);
    const pollInterval = useRef(null);

    const mergeComments = (existing, incoming) => {
        const existingIds = new Set(existing.map(c => c.id));
        const uniqueIncoming = incoming.filter(c => !existingIds.has(c.id));
        return [...uniqueIncoming, ...existing];
    };

    const fetchComments = async (token = null, order = 'relevance', append = false) => {
        if (!videoId) return;
        if (!append) setIsLoading(true);

        try {
            const res = await window.api.getComments(videoId, token, order);
            if (res.success) {
                const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
                const newToken = res.data.nextPageToken || null;

                if (append) {
                    setComments(prev => [...prev, ...items]);
                } else if (isLiveMode) {
                    setComments(prev => mergeComments(prev, items));
                } else {
                    setComments(items);
                }
                setNextPageToken(newToken);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            if (!append) setIsLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        setIsLiveMode(false);
        if (pollInterval.current) clearInterval(pollInterval.current);

        if (videoId && window.api) {
            fetchComments(null, 'relevance');
        }

        return () => {
            isMounted = false;
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [videoId]);

    useEffect(() => {
        if (isLiveMode) {
            fetchComments(null, 'time');
            pollInterval.current = setInterval(() => fetchComments(null, 'time'), 10000);
        } else {
            if (pollInterval.current) clearInterval(pollInterval.current);
        }
        return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
    }, [isLiveMode]);

    const handleLoadMore = () => {
        if (!nextPageToken || isLoadingMore) return;
        setIsLoadingMore(true);
        fetchComments(nextPageToken, isLiveMode ? 'time' : 'relevance', true).then(() => setIsLoadingMore(false));
    };

    const handlePost = async () => {
        if (!newComment.trim() || isPosting) return;
        setIsPosting(true);
        try {
            const res = await window.api.postComment(videoId, newComment);
            if (res.success) {
                setComments(prev => [res.data, ...prev]);
                setNewComment('');
            } else {
                alert('Error: ' + res.error);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
        setIsPosting(false);
    };

    const toggleLiveMode = () => {
        if (!isLiveMode) {
            setComments([]);
            setIsLiveMode(true);
        } else {
            setIsLiveMode(false);
            fetchComments(null, 'relevance');
        }
    };

    if (!videoId) return null;
    const safeComments = Array.isArray(comments) ? comments : [];

    return (
        <div className="mt-8 p-4 border-t border-[#b9baa3]/10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#d6d5c9] font-mono tracking-widest flex items-center gap-2">
                    <span className="text-[#a22c29]">::</span> COMMS_Relay
                </h3>
                <button
                    onClick={toggleLiveMode}
                    className={`px-4 py-1 rounded border font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${isLiveMode ? 'bg-[#a22c29] text-white border-[#a22c29] shadow-[0_0_15px_#a22c29] animate-pulse' : 'bg-transparent text-[#b9baa3] border-[#b9baa3]/30 hover:border-[#d6d5c9]'}`}
                >
                    {isLiveMode ? '● LIVE SYNC ACTIVE' : '○ ENABLE LIVE FEED'}
                </button>
            </div>

            <div className="flex gap-4 mb-8">
                <div className="w-10 h-10 rounded bg-[#a22c29] flex items-center justify-center text-white font-bold flex-shrink-0">ME</div>
                <div className="flex-1">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="TRANSMIT MESSAGE..."
                        className="w-full bg-[#0a100d] border border-[#b9baa3]/20 rounded p-3 text-xs font-mono text-[#d6d5c9] focus:border-[#a22c29] outline-none resize-none h-20 placeholder-[#b9baa3]/30"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={handlePost}
                            disabled={isPosting || !newComment.trim()}
                            className={`bg-[#b9baa3]/10 hover:bg-[#a22c29] text-[#d6d5c9] hover:text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all border border-[#b9baa3]/20 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isPosting ? 'TRANSMITTING...' : 'SEND'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {isLoading && safeComments.length === 0 ? (
                    <div className="text-[#b9baa3]/40 font-mono text-xs animate-pulse">DECRYPTING STREAM...</div>
                ) : safeComments.length === 0 ? (
                    <div className="text-[#b9baa3]/40 font-mono text-xs">NO TRANSMISSIONS FOUND.</div>
                ) : (
                    <>
                        {safeComments.map((item) => {
                            if (!item?.snippet) return null;
                            return <CommentItem key={item.id} item={item} />;
                        })}
                        {nextPageToken && !isLiveMode && (
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="w-full py-4 bg-[#b9baa3]/5 border border-[#b9baa3]/10 text-[#b9baa3] font-mono text-xs uppercase tracking-widest hover:bg-[#a22c29] hover:text-white transition-colors disabled:opacity-50 mt-8"
                            >
                                {isLoadingMore ? 'FETCHING PACKETS...' : 'LOAD MORE TRANSMISSIONS'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default CommentsSection;