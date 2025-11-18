const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    checkAuth: () => ipcRenderer.invoke('auth:check'), // NEW
    login: () => ipcRenderer.invoke('auth:login'),
    getSubscriptions: () => ipcRenderer.invoke('youtube:getSubscriptions'),
    getMyPlaylists: () => ipcRenderer.invoke('youtube:getMyPlaylists'),
    getLatestVideo: (channelId) => ipcRenderer.invoke('youtube:getLatestVideo', channelId),
    getTrendingByCategory: (categoryId) => ipcRenderer.invoke('youtube:getTrendingByCategory', categoryId),
    getTrending: () => ipcRenderer.invoke('youtube:getTrending'),
    getSuggestions: (query) => ipcRenderer.invoke('youtube:getSuggestions', query),
    search: (query) => ipcRenderer.invoke('youtube:search', query),
    getChannelContent: (channelId, type) => ipcRenderer.invoke('youtube:getChannelContent', channelId, type),
    getChannelPlaylists: (channelId) => ipcRenderer.invoke('youtube:getChannelPlaylists', channelId),
    getPlaylistItems: (playlistId) => ipcRenderer.invoke('youtube:getPlaylistItems', playlistId),
    getChannelIcon: (channelId) => ipcRenderer.invoke('youtube:getChannelIcon', channelId),
    getSponsorSegments: (videoId) => ipcRenderer.invoke('youtube:getSponsorSegments', videoId),
    getFormats: (videoId) => ipcRenderer.invoke('ytdlp:getFormats', videoId),
    getAudioStream: (videoInfo) => ipcRenderer.invoke('ytdlp:getAudioStream', videoInfo),
    startDownload: (videoId, videoFormatId, audioFormatId) => ipcRenderer.invoke('download:start', videoId, videoFormatId, audioFormatId),
    addHistory: (videoId, title, channel, channelId, categoryId, categoryName) =>
        ipcRenderer.invoke('db:addHistory', videoId, title, channel, channelId, categoryId, categoryName),
    getHistory: () => ipcRenderer.invoke('db:getHistory')
});