const { google } = require('googleapis');
const authManager = require('./authManager');

const youtube = google.youtube('v3');

async function executeWithRetry(apiCall) {
    try {
        return await apiCall(authManager.getApiKey());
    } catch (error) {
        if (error.code === 403 && authManager.rotateApiKey()) {
            return await apiCall(authManager.getApiKey());
        }
        throw error;
    }
}

async function enrichWithChannelIcons(items) {
    if (!items || items.length === 0) return items;

    try {
        const channelIds = [...new Set(items.map(item => item.snippet?.channelId).filter(Boolean))];
        if (channelIds.length === 0) return items;

        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.channels.list({
                key: currentKey,
                part: 'snippet',
                id: channelIds.join(','),
                maxResults: 50
            });
        });

        const iconMap = {};
        response.data.items.forEach(channel => {
            iconMap[channel.id] = channel.snippet.thumbnails.high.url;
        });

        return items.map(item => {
            if (item.snippet && item.snippet.channelId) {
                item.channelThumbnail = iconMap[item.snippet.channelId];
            }
            return item;
        });

    } catch (error) {
        return items;
    }
}

async function getSearchSuggestions(query) {
    try {
        const url = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const text = await response.text();

        const matchResult = text.match(/window.google.ac.h\((.*)\)/);
        if (!matchResult || !matchResult[1]) {
            return [];
        }

        const jsonString = matchResult[1];
        const data = JSON.parse(jsonString);
        return data[1].map(s => s[0]);
    } catch (error) {
        return [];
    }
}

async function getSponsorSegments(videoId) {
    try {
        const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=["sponsor","intro","outro","selfpromo","interaction"]`;
        const response = await fetch(url);
        if (response.status === 404) return [];
        const data = await response.json();
        return data;
    } catch (error) {
        return [];
    }
}

async function getMySubscriptions() {
    try {
        const client = authManager.getClient();
        const response = await youtube.subscriptions.list({
            auth: client,
            part: 'snippet',
            mine: true,
            maxResults: 50
        });
        return response.data.items;
    } catch (error) {
        console.error("Subscription fetch failed:", error.message);
        throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
}

async function getMyPlaylists() {
    try {
        const client = authManager.getClient();

        const response = await youtube.playlists.list({
            auth: client,
            part: 'snippet,contentDetails',
            mine: true,
            maxResults: 50
        });
        return response.data.items;

    } catch (error) {
        console.error("OAuth Playlist fetch failed:", error.message);

        try {
            throw new Error(`Playlist Error: ${error.message}`);
        } catch (backupError) {
            throw new Error(backupError.message);
        }
    }
}

async function getLatestVideoForChannel(channelId) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.search.list({
                key: currentKey,
                part: 'snippet',
                channelId: channelId,
                order: 'date',
                type: 'video',
                maxResults: 1
            });
        });

        if (response.data.items && response.data.items.length > 0) {
            return response.data.items[0].id.videoId;
        } else {
            throw new Error('No videos found for this channel.');
        }
    } catch (error) {
        throw new Error('Failed to fetch latest video.');
    }
}

async function getTrendingByCategory(categoryId) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.videos.list({
                key: currentKey,
                part: 'snippet',
                chart: 'mostPopular',
                regionCode: 'IN',
                videoCategoryId: categoryId,
                maxResults: 20
            });
        });
        return await enrichWithChannelIcons(response.data.items);
    } catch (error) {
        throw new Error('Failed to fetch trending by category.');
    }
}

async function getTrendingVideos() {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.videos.list({
                key: currentKey,
                part: 'snippet',
                chart: 'mostPopular',
                regionCode: 'IN',
                maxResults: 20
            });
        });
        return await enrichWithChannelIcons(response.data.items);
    } catch (error) {
        throw new Error('Failed to fetch trending videos.');
    }
}

async function searchVideos(query) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.search.list({
                key: currentKey,
                part: 'snippet',
                q: query,
                type: 'video',
                fields: 'items(id/videoId,snippet(publishedAt,channelId,title,description,channelTitle,thumbnails/high))',
                maxResults: 20
            });
        });
        return await enrichWithChannelIcons(response.data.items);
    } catch (error) {
        throw new Error('Failed to search videos.');
    }
}

async function getChannelContent(channelId, type = 'video') {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.search.list({
                key: currentKey,
                part: 'snippet',
                channelId: channelId,
                order: 'date',
                type: 'video',
                eventType: type === 'live' ? 'live' : undefined,
                fields: 'items(id/videoId,snippet(publishedAt,channelId,title,description,channelTitle,thumbnails/high))',
                maxResults: 25
            });
        });
        return response.data.items;
    } catch (error) {
        throw new Error(`Failed to fetch channel ${type}.`);
    }
}

async function getChannelPlaylists(channelId) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.playlists.list({
                key: currentKey,
                part: 'snippet,contentDetails',
                channelId: channelId,
                fields: 'items(id,snippet(publishedAt,channelId,title,thumbnails/high,channelTitle),contentDetails/itemCount)',
                maxResults: 25
            });
        });
        return response.data.items;
    } catch (error) {
        throw new Error('Failed to fetch channel playlists.');
    }
}

async function getPlaylistItems(playlistId) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.playlistItems.list({
                key: currentKey,
                part: 'snippet',
                playlistId: playlistId,
                fields: 'items(id,snippet(publishedAt,channelId,title,description,channelTitle,thumbnails/high,resourceId/videoId))',
                maxResults: 50
            });
        });
        return response.data.items;
    } catch (apiKeyError) {
        try {
            const client = authManager.getClient();
            const response = await youtube.playlistItems.list({
                auth: client,
                part: 'snippet',
                playlistId: playlistId,
                maxResults: 50
            });
            return response.data.items;
        } catch (oauthError) {
            throw new Error(`Failed to fetch playlist items: ${oauthError.message}`);
        }
    }
}

async function getChannelIcon(channelId) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.channels.list({
                key: currentKey,
                part: 'snippet,brandingSettings',
                id: channelId,
                maxResults: 1
            });
        });

        if (response.data.items.length > 0) {
            const channel = response.data.items[0];

            const iconUrl = channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url;

            const bannerUrl = channel.brandingSettings?.image?.bannerTvImageUrl ||
                channel.brandingSettings?.image?.bannerTabletImageUrl ||
                channel.brandingSettings?.image?.bannerExternalUrl;

            return {
                icon: iconUrl,
                banner: bannerUrl || null
            };
        }
        return { icon: null, banner: null };
    } catch (error) {
        return { icon: null, banner: null };
    }
}

async function checkSubscriptionStatus(channelId) {
    try {
        const client = authManager.getClient();
        const response = await youtube.subscriptions.list({
            auth: client,
            part: 'id',
            forChannelId: channelId,
            mine: true
        });
        const isSubscribed = response.data.items.length > 0;
        return { isSubscribed: isSubscribed, subscriptionId: isSubscribed ? response.data.items[0].id : null };
    } catch (error) {
        return { isSubscribed: false, subscriptionId: null };
    }
}

async function modifySubscription(channelId, action) {
    const client = authManager.getClient();

    if (action === 'subscribe') {
        const response = await youtube.subscriptions.insert({
            auth: client,
            part: 'snippet',
            resource: {
                snippet: {
                    resourceId: {
                        kind: 'youtube#channel',
                        channelId: channelId
                    }
                }
            }
        });
        return { success: true, id: response.data.id };
    } else if (action === 'unsubscribe') {
        const status = await checkSubscriptionStatus(channelId);
        let subscriptionId;

        if (status.isSubscribed) {
            subscriptionId = status.subscriptionId;
        } else {
            throw new Error('Not currently subscribed.');
        }

        await youtube.subscriptions.delete({
            auth: client,
            id: subscriptionId
        });
        return { success: true, id: subscriptionId };
    }
    throw new Error('Invalid subscription action.');
}

async function getVideoComments(videoId, pageToken = null, order = 'relevance') {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            const params = {
                key: currentKey,
                part: 'snippet,replies',
                videoId: videoId,
                maxResults: 20,
                order: order,
                textFormat: 'plainText'
            };
            if (pageToken) params.pageToken = pageToken;
            return await youtube.commentThreads.list(params);
        });
        return {
            items: response.data.items || [],
            nextPageToken: response.data.nextPageToken || null
        };
    } catch (error) {
        console.error("Comments fetch failed:", error.message);
        return { items: [], nextPageToken: null };
    }
}

async function postComment(videoId, text) {
    try {
        const client = authManager.getClient();
        const response = await youtube.commentThreads.insert({
            auth: client,
            part: 'snippet',
            resource: {
                snippet: {
                    videoId: videoId,
                    topLevelComment: {
                        snippet: {
                            textOriginal: text
                        }
                    }
                }
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to post comment: ${error.message}`);
    }
}

async function getCommentReplies(parentId) {
    try {
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.comments.list({
                key: currentKey,
                part: 'snippet',
                parentId: parentId,
                maxResults: 100,
                textFormat: 'plainText'
            });
        });
        return response.data.items || [];
    } catch (error) {
        console.error("Replies fetch failed:", error.message);
        return [];
    }
}

async function replyToComment(parentId, text) {
    try {
        const client = authManager.getClient();
        const response = await youtube.comments.insert({
            auth: client,
            part: 'snippet',
            resource: {
                snippet: {
                    parentId: parentId,
                    textOriginal: text
                }
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to reply: ${error.message}`);
    }
}

async function rateComment(commentId, rating) {
    try {
        const client = authManager.getClient();
        await youtube.comments.setRating({
            auth: client,
            id: commentId,
            rating: rating
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


module.exports = {
    getSearchSuggestions,
    getMySubscriptions,
    getMyPlaylists,
    getLatestVideoForChannel,
    getTrendingByCategory,
    getTrendingVideos,
    searchVideos,
    getChannelContent,
    getChannelPlaylists,
    getPlaylistItems,
    getChannelIcon,
    getSponsorSegments,
    checkSubscriptionStatus,
    modifySubscription,
    getVideoComments,
    postComment,
    getCommentReplies,
    replyToComment,
    rateComment
};