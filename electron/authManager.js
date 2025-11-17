const { BrowserWindow } = require('electron');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
require('dotenv').config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];

let tokens = null;

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

function getTokens() {
    return tokens;
}

function getClient() {
    if (!tokens) {
        throw new Error('User is not authenticated.');
    }
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
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
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
};