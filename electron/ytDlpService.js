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
const ffmpegPath = getBinaryPath('ffmpeg');

function getVideoFormats(videoId) {
    return new Promise((resolve, reject) => {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const cwd = path.dirname(ytDlpPath);

        const ytDlp = spawn(ytDlpPath, [
            '--dump-json',
            '--no-playlist',
            '--youtube-skip-dash-manifest',
            '--no-check-certificates',
            videoUrl
        ], { cwd });

        let output = '';
        let errorOutput = '';

        ytDlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytDlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.log('[yt-dlp stderr]:', data.toString());
        });

        ytDlp.on('close', (code) => {
            if (code === 0) {
                try {
                    const jsonData = JSON.parse(output);
                    resolve(jsonData);
                } catch (e) {
                    reject(new Error('Failed to parse yt-dlp JSON output.'));
                }
            } else {
                reject(new Error(`yt-dlp exited with code ${code}: ${errorOutput}`));
            }
        });

        ytDlp.on('error', (err) => {
            reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
        });
    });
}

function getAudioStream(videoInfo) {
    const formats = videoInfo.formats || [];
    const audio = formats.find(f =>
        f.acodec !== 'none' && f.vcodec === 'none' && f.ext === 'm4a'
    );
    return audio ? audio.url : null;
}

module.exports = {
    getVideoFormats,
    getAudioStream
};