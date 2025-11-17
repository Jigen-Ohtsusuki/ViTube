const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const isDev = !app.isPackaged;
const dbDir = isDev ? process.cwd() : app.getPath('userData');
const dbPath = path.join(dbDir, 'ViTube.db');

let db;

function initDatabase() {
    db = new Database(dbPath);

    const createTable = `
        CREATE TABLE IF NOT EXISTS view_history (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    videoId TEXT NOT NULL,
                                                    title TEXT NOT NULL,
                                                    channel TEXT NOT NULL,
                                                    channelId TEXT,
                                                    categoryId TEXT,
                                                    categoryName TEXT,
                                                    viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.exec(createTable);

    try {
        db.prepare('SELECT categoryId FROM view_history LIMIT 1').get();
    } catch (error) {
        db.exec('ALTER TABLE view_history ADD COLUMN categoryId TEXT');
        db.exec('ALTER TABLE view_history ADD COLUMN categoryName TEXT');
        console.log('Migrated database, added category columns');
    }

    console.log('Database initialized at', dbPath);
}

function addHistory(videoId, title, channel, channelId, categoryId, categoryName) {
    try {
        const stmt = db.prepare(
            'INSERT INTO view_history (videoId, title, channel, channelId, categoryId, categoryName) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(videoId, title, channel, channelId, categoryId, categoryName);
        return { success: true };
    } catch (error) {
        console.error('Failed to add history:', error.message);
        return { success: false, error: error.message };
    }
}

function getHistory() {
    try {
        const stmt = db.prepare('SELECT * FROM view_history ORDER BY viewedAt DESC LIMIT 50');
        return { success: true, data: stmt.all() };
    } catch (error) {
        console.error('Failed to get history:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initDatabase,
    addHistory,
    getHistory
};