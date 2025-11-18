const { app, BrowserWindow } = require('electron');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const apiKeys = (process.env.GOOGLE_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
if (apiKeys.length === 0 && process.env.GOOGLE_API_KEY) {
    apiKeys.push(process.env.GOOGLE_API_KEY);
}

let currentKeyIndex = 0;

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
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

        const server = http.createServer(async (req, res) => {
            try {
                const { code } = url.parse(req.url, true).query;

                if (code && !serverClosed) {
                    serverClosed = true;

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
                } else if (!code) {
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
        }).listen(8080);
    });
}

module.exports = {
    startLogin,
    getTokens,
    getClient,
    getApiKey,
    rotateApiKey
};