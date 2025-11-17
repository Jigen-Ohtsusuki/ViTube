const { google } = require('googleapis');
const authManager = require('./authManager');

const youtube = google.youtube('v3');

async function enrichWithChannelIcons(items) {
    if (!items || items.length === 0) return items;

    try {
        const channelIds = [...new Set(items.map(item => item.snippet?.channelId).filter(Boolean))];
        if (channelIds.length === 0) return items;

        const response = await youtube.channels.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            id: channelIds.join(','),
            maxResults: 50
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
        console.error('Error enriching channel icons:', error.message);
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
        console.error('Error fetching suggestions:', error.message);
        return [];
    }
}

async function getSponsorSegments(videoId) {
    try {
        // SponsorBlock Public API (No Auth Required)
        const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=["sponsor","intro","outro","selfpromo","interaction"]`;
        const response = await fetch(url);
        if (response.status === 404) return []; // No segments found
        const data = await response.json();
        return data;
    } catch (error) {
        // Fail silently if network error or API down
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
        console.error('Error fetching subscriptions:', error.message);
        throw new Error('Failed to fetch subscriptions');
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
        console.error('Error fetching my playlists:', error.message);
        throw new Error('Failed to fetch my playlists');
    }
}

async function getLatestVideoForChannel(channelId) {
    try {
        const response = await youtube.search.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            channelId: channelId,
            order: 'date',
            type: 'video',
            maxResults: 1
        });

        if (response.data.items && response.data.items.length > 0) {
            return response.data.items[0].id.videoId;
        } else {
            throw new Error('No videos found for this channel.');
        }
    } catch (error) {
        console.error('Error fetching latest video:', error.message);
        throw new Error('Failed to fetch latest video.');
    }
}

async function getTrendingByCategory(categoryId) {
    try {
        const response = await youtube.videos.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            chart: 'mostPopular',
            regionCode: 'IN',
            videoCategoryId: categoryId,
            maxResults: 20
        });
        return await enrichWithChannelIcons(response.data.items);
    } catch (error) {
        console.error('Error fetching trending by category:', error.message);
        throw new Error('Failed to fetch trending by category.');
    }
}

async function getTrendingVideos() {
    try {
        const response = await youtube.videos.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            chart: 'mostPopular',
            regionCode: 'IN',
            maxResults: 20
        });
        return await enrichWithChannelIcons(response.data.items);
    } catch (error) {
        console.error('Error fetching trending videos:', error.message);
        throw new Error('Failed to fetch trending videos.');
    }
}

async function searchVideos(query) {
    try {
        const response = await youtube.search.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 20
        });
        return await enrichWithChannelIcons(response.data.items);
    } catch (error) {
        console.error('Error searching videos:', error.message);
        throw new Error('Failed to search videos.');
    }
}

async function getChannelContent(channelId, type = 'video') {
    try {
        const response = await youtube.search.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            channelId: channelId,
            order: 'date',
            type: 'video',
            eventType: type === 'live' ? 'live' : undefined,
            maxResults: 25
        });
        return response.data.items;
    } catch (error) {
        console.error(`Error fetching channel ${type}:`, error.message);
        throw new Error(`Failed to fetch channel ${type}.`);
    }
}

async function getChannelPlaylists(channelId) {
    try {
        const response = await youtube.playlists.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet,contentDetails',
            channelId: channelId,
            maxResults: 25
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching channel playlists:', error.message);
        throw new Error('Failed to fetch channel playlists.');
    }
}

async function getPlaylistItems(playlistId) {
    try {
        const client = authManager.getClient();
        const response = await youtube.playlistItems.list({
            auth: client,
            part: 'snippet',
            playlistId: playlistId,
            maxResults: 50
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching playlist items:', error.message);
        throw new Error('Failed to fetch playlist items.');
    }
}

async function getChannelIcon(channelId) {
    try {
        const response = await youtube.channels.list({
            key: authManager.GOOGLE_API_KEY,
            part: 'snippet',
            id: channelId,
            maxResults: 1
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