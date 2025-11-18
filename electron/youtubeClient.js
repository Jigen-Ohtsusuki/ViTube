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
            iconMap[channel.id] = channel.snippet.thumbnails.default.url;
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

        // Try OAuth (Mine: true)
        const response = await youtube.playlists.list({
            auth: client,
            part: 'snippet,contentDetails',
            mine: true,
            maxResults: 50
        });
        return response.data.items;

    } catch (error) {
        console.error("OAuth Playlist fetch failed:", error.message);

        // Backup: If OAuth fails (Quota/Auth), try getting public playlists via Channel ID and API Key
        try {
            // We need the channel ID of the logged-in user.
            // Getting 'mine' channel info also requires OAuth, so if that failed, we are stuck.
            // But we can try to use the 'executeWithRetry' for the playlist call if we knew the channel ID.
            // For now, we just throw the detailed error so the user knows.
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
        // First, try with API Key Rotation (Faster, saves OAuth quota)
        const response = await executeWithRetry(async (currentKey) => {
            return await youtube.playlistItems.list({
                key: currentKey,
                part: 'snippet',
                playlistId: playlistId,
                maxResults: 50
            });
        });
        return response.data.items;
    } catch (apiKeyError) {
        // If API Key fails (maybe private playlist?), try OAuth
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
                part: 'snippet',
                id: channelId,
                maxResults: 1
            });
        });
        if (response.data.items.length > 0) {
            return response.data.items[0].snippet.thumbnails.default.url;
        }
        return null;
    } catch (error) {
        return null;
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
    getSponsorSegments
};