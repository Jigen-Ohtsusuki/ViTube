const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const getBinaryPath = (binaryName) => {
    const platform = os.platform();
    const isWin = platform === 'win32';
    const finalName = isWin ? `${binaryName}.exe` : binaryName;

    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'assets', finalName);
    }
    return path.join(app.getAppPath(), 'assets', finalName);
};

const ytDlpPath = getBinaryPath('yt-dlp');

const downloadPath = app.getPath('downloads');

function startDownload(videoId, videoFormatId, audioFormatId) {
    return new Promise((resolve, reject) => {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const formatString = `${videoFormatId}+${audioFormatId}`;
        const cwd = path.dirname(ytDlpPath);

        const ytDlp = spawn(ytDlpPath, [
            '-o',
            path.join(downloadPath, '%(title)s.%(ext)s'),
            '-f',
            formatString,
            '--merge-output-format',
            'mp4',
            '--ffmpeg-location', cwd,
            videoUrl
        ], { cwd });

        ytDlp.stdout.on('data', (data) => {
            console.log(`[yt-dlp] ${data}`);
        });

        ytDlp.stderr.on('data', (data) => {
            console.error(`[yt-dlp] ${data}`);
        });

        ytDlp.on('close', (code) => {
            if (code === 0) {
                resolve(`Download complete: ${videoId}`);
            } else {
                reject(new Error(`yt-dlp exited with code ${code}`));
            }
        });

        ytDlp.on('error', (err) => {
            reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
        });
    });
}

module.exports = {
    startDownload,
};