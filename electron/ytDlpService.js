const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const getBinaryPath = () => {
    if (app.isPackaged) {
        // In production, assets are in 'resources/assets' next to the exe
        return path.join(process.resourcesPath, 'assets', 'yt-dlp.exe');
    }
    // In dev, assets are in the project root
    return path.join(app.getAppPath(), 'assets', 'yt-dlp.exe');
};

const ytDlpPath = getBinaryPath();

function getVideoFormats(videoId) {
    return new Promise((resolve, reject) => {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // IMPORTANT: We must set the cwd (Current Working Directory) so yt-dlp finds ffmpeg
        const cwd = path.dirname(ytDlpPath);

        const ytDlp = spawn(ytDlpPath, [
            '--dump-json',
            '--no-playlist',
            // Force extraction of ALL individual streams, not just the master playlist
            '--youtube-skip-dash-manifest',  // Skip DASH (we want HLS for live)
            '--no-check-certificates',       // Sometimes needed for live streams
            videoUrl
        ], { cwd });

        let output = '';
        let errorOutput = '';

        ytDlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytDlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
            // Log warnings but don't fail
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