const { app, BrowserWindow } = require('electron');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:8080';
const HARDCODED_API_KEYS = [
    'YOUR_API_KEY_1',
    'YOUR_API_KEY_2',
    // ...
];

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error("Missing required OAuth configuration.");
}

const apiKeys = HARDCODED_API_KEYS.filter(Boolean);
let currentKeyIndex = 0;

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube'
];

const tokenPath = path.join(app.getPath('userData'), 'tokens.json');
let tokens = null;

if (fs.existsSync(tokenPath)) {
    try {
        tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    } catch (e) {
        console.error('Failed to load tokens', e);
    }
}

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

if (tokens) {
    oauth2Client.setCredentials(tokens);
}

function getTokens() {
    return tokens;
}

function getClient() {
    if (!tokens) {
        throw new Error('User is not authenticated.');
    }
    return oauth2Client;
}

function getApiKey() {
    return apiKeys[currentKeyIndex];
}

function rotateApiKey() {
    if (currentKeyIndex < apiKeys.length - 1) {
        currentKeyIndex++;
        return true;
    }
    return false;
}

function startLogin() {
    return new Promise((resolve, reject) => {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });

        const authWindow = new BrowserWindow({
            width: 600,
            height: 800,
            modal: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        authWindow.loadURL(authUrl);

        let serverClosed = false;

        const redirectUrl = new URL(REDIRECT_URI);
        const port = redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80);

        const server = http.createServer(async (req, res) => {
            try {
                if (req.url.startsWith(redirectUrl.pathname) && !serverClosed) {
                    const parsedUrl = url.parse(req.url, true);
                    const { code } = parsedUrl.query;

                    if (code) {
                        serverClosed = true;

                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('Authentication successful! You can close this window.');

                        server.close();
                        if (authWindow && !authWindow.isDestroyed()) {
                            authWindow.close();
                        }

                        const { tokens: newTokens } = await oauth2Client.getToken(code);
                        tokens = newTokens;
                        oauth2Client.setCredentials(tokens);

                        fs.writeFileSync(tokenPath, JSON.stringify(tokens));

                        resolve(tokens);
                    }
                } else if (!serverClosed) {
                    res.writeHead(404);
                    res.end();
                }

            } catch (error) {
                if (!serverClosed) {
                    serverClosed = true;
                    if (authWindow && !authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                    server.close();
                }
                reject(error);
            }
        }).listen(port);
    });
}

module.exports = {
    startLogin,
    getTokens,
    getClient,
    getApiKey,
    rotateApiKey
};