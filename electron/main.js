const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const authManager = require('./authManager');
const youtubeClient = require('./youtubeClient');
const ytDlpService = require('./ytDlpService');
const db = require('./database');
const downloadManager = require('./downloadManager');
const dotenv = require('dotenv');
const https = require('https');

const isDev = !app.isPackaged;

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('max-active-webgl-contexts', '100');

let mainWindow;

function createWindow() {
    const windowOptions = {
        width: 1280,
        height: 720,
        backgroundColor: '#0f0f0f',
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
            backgroundThrottling: false,
            webviewTag: true
        },
        show: false
    };

    if (!isDev) {
        windowOptions.autoHideMenuBar = true;
        windowOptions.menu = null;
        Menu.setApplicationMenu(null);
    }

    mainWindow = new BrowserWindow(windowOptions);

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window:maximized');
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window:unmaximized');
    });

    session.defaultSession.webRequest.onBeforeSendHeaders(
        {
            urls: [
                '*://*.googlevideo.com/*',
                '*://*.youtube.com/*',
                '*://*.ggpht.com/*',
                '*://*.googleusercontent.com/*'
            ]
        },
        (details, callback) => {
            const { url, requestHeaders } = details;
            if (url.includes('googlevideo.com')) {
                delete requestHeaders['Referer'];
                delete requestHeaders['Origin'];
            } else {
                requestHeaders['Referer'] = 'https://www.youtube.com/';
                requestHeaders['Origin'] = 'https://www.youtube.com';
            }

            callback({ cancel: false, requestHeaders: requestHeaders });
        }
    );

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

    ipcMain.on('window:minimize', () => mainWindow?.minimize());

    ipcMain.on('window:maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('window:close', () => mainWindow?.close());

    ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

    ipcMain.handle('auth:check', async () => {
        const tokens = authManager.getTokens();
        return !!tokens;
    });

    ipcMain.handle('auth:login', async () => {
        try {
            const tokens = await authManager.startLogin();
            return { success: true, hasTokens: !!tokens };
        } catch (error) {
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
            const channelInfo = await youtubeClient.getChannelIcon(channelId);
            return { success: true, data: channelInfo };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:checkSubscription', async (event, channelId) => {
        try {
            const status = await youtubeClient.checkSubscriptionStatus(channelId);
            return { success: true, data: status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:modifySubscription', async (event, channelId, action) => {
        try {
            const result = await youtubeClient.modifySubscription(channelId, action);
            return { success: true, data: result };
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

    ipcMain.handle('youtube:getComments', async (event, videoId, pageToken, order) => {
        try {
            const result = await youtubeClient.getVideoComments(videoId, pageToken, order);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:postComment', async (event, videoId, text) => {
        try {
            const result = await youtubeClient.postComment(videoId, text);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getReplies', async (event, parentId) => {
        try {
            const result = await youtubeClient.getCommentReplies(parentId);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:replyToComment', async (event, parentId, text) => {
        try {
            const result = await youtubeClient.replyToComment(parentId, text);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:rateComment', async (event, commentId, rating) => {
        try {
            const result = await youtubeClient.rateComment(commentId, rating);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:rateVideo', async (event, videoId, rating) => {
        try {
            const result = await youtubeClient.rateVideo(videoId, rating);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getVideoRating', async (event, videoId) => {
        try {
            const result = await youtubeClient.getVideoRating(videoId);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getVideoStats', async (event, videoId) => {
        try {
            const result = await youtubeClient.getVideoStats(videoId);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:getSubtitleContent', async (event, url) => {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => { resolve({ success: true, data }); });
            }).on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
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