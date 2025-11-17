const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const authManager = require('./authManager');
const youtubeClient = require('./youtubeClient');
const ytDlpService = require('./ytDlpService');
const db = require('./database');
const downloadManager = require('./downloadManager');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        backgroundColor: '#0f0f0f',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            backgroundThrottling: false
        },
        show: false
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

app.whenReady().then(() => {
    db.initDatabase();

    ipcMain.handle('auth:login', async () => {
        try {
            const tokens = await authManager.startLogin();
            return { success: true, hasTokens: !!tokens };
        } catch (error) {
            console.error('Failed to login:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getSubscriptions', async () => {
        try {
            const subscriptions = await youtubeClient.getMySubscriptions();
            return { success: true, data: subscriptions };
        } catch (error)
        {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getMyPlaylists', async () => {
        try {
            const playlists = await youtubeClient.getMyPlaylists();
            return { success: true, data: playlists };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getLatestVideo', async (event, channelId) => {
        try {
            const videoId = await youtubeClient.getLatestVideoForChannel(channelId);
            return { success: true, data: videoId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getTrendingByCategory', async (event, categoryId) => {
        try {
            const videos = await youtubeClient.getTrendingByCategory(categoryId);
            return { success: true, data: videos };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getTrending', async () => {
        try {
            const videos = await youtubeClient.getTrendingVideos();
            return { success: true, data: videos };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getSuggestions', async (event, query) => {
        try {
            const suggestions = await youtubeClient.getSearchSuggestions(query);
            return { success: true, data: suggestions };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:search', async (event, query) => {
        try {
            const videos = await youtubeClient.searchVideos(query);
            return { success: true, data: videos };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getChannelContent', async (event, channelId, type) => {
        try {
            const videos = await youtubeClient.getChannelContent(channelId, type);
            return { success: true, data: videos };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getChannelPlaylists', async (event, channelId) => {
        try {
            const playlists = await youtubeClient.getChannelPlaylists(channelId);
            return { success: true, data: playlists };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getPlaylistItems', async (event, playlistId) => {
        try {
            const items = await youtubeClient.getPlaylistItems(playlistId);
            return { success: true, data: items };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getChannelIcon', async (event, channelId) => {
        try {
            const url = await youtubeClient.getChannelIcon(channelId);
            return { success: true, data: url };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getSponsorSegments', async (event, videoId) => {
        try {
            const segments = await youtubeClient.getSponsorSegments(videoId);
            return { success: true, data: segments };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('ytdlp:getFormats', async (event, videoId) => {
        try {
            const formats = await ytDlpService.getVideoFormats(videoId);
            return { success: true, data: formats };
        } catch (error) {
            console.error(error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('ytdlp:getAudioStream', (event, videoInfo) => {
        try {
            const url = ytDlpService.getAudioStream(videoInfo);
            return { success: true, data: url };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('download:start', async (event, videoId, videoFormatId, audioFormatId) => {
        try {
            await downloadManager.startDownload(videoId, videoFormatId, audioFormatId);
            return { success: true };
        } catch (error) {
            console.error(error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:addHistory', (event, videoId, title, channel, channelId, categoryId, categoryName) => {
        return db.addHistory(videoId, title, channel, channelId, categoryId, categoryName);
    });

    ipcMain.handle('db:getHistory', () => {
        return db.getHistory();
    });

    ipcMain.handle('app:getVersion', () => app.getVersion());

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});