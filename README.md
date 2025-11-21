# 📺 ViTube
**The Ultimate Private Desktop YouTube Client**

![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

4K Streaming • Background Play • SponsorBlock • Downloader

---

## ⚡ Overview

**ViTube** is a modern, high-performance desktop client for YouTube built with Electron and React. It is designed for power users who want a distraction-free, ad-free, and privacy-respecting experience.

Unlike the web player, ViTube leverages `yt-dlp` under the hood to stream **4K HDR content**, merge separate audio/video streams in real-time, and provide granular control over playback and downloads.

##  Project Structure

```sh
└── ViTube/
    ├── LICENSE
    ├── README.md
    ├── assets
    │   └── icon.ico
    ├── electron
    │   ├── authManager.template.js
    │   ├── database.js
    │   ├── downloadManager.js
    │   ├── main.js
    │   ├── preload.js
    │   ├── youtubeClient.js
    │   └── ytDlpService.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── src
    │   ├── App.jsx
    │   ├── UI
    │   ├── categoryMap.js
    │   ├── index.css
    │   ├── main.jsx
    │   └── store.js
    ├── tailwind.config.js
    └── vite.config.js
```

## ✨ Key Features

### 🎥 Enhanced Viewing
- **4K & HDR Support:** Streams high-fidelity video formats that browsers often limit.
- **Custom Global Player:** A persistent video player that never stops, even when navigating pages.
- **Mini Player (PiP):** Seamlessly switch to Picture-in-Picture mode while browsing the app.
- **Background Play:** Audio continues playing even when the app is minimized or closed to the tray.
- **SponsorBlock Integrated:** Automatically skips sponsors, intros, and non-music segments with visual indicators on the seek bar.

### ⬇️ Power Tools
- **Advanced Downloader:** Download videos in specific resolutions (up to 8K) and audio formats (lossless/high-bitrate).
- **Audio Mode:** Switch to audio-only mode instantly to save bandwidth and resources.
- **Playback Speed:** Granular speed controls.

### 🎨 Modern UI/UX
- **Flat Design:** A sleek, dark-themed UI with no shadows and sharp borders.
- **GSAP Animations:** Butter-smooth transitions and micro-interactions.
- **Personalized Feed:** Home feed based on your history and trending categories.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Core** | Electron, Node.js |
| **Frontend** | React, Vite, TailwindCSS, GSAP |
| **State** | Zustand (Persistent Storage) |
| **Backend Engine** | `yt-dlp`, `ffmpeg`, `better-sqlite3` |
| **API** | YouTube Data API v3 |

---

## 🚀 Installation & Setup

### Prerequisites
1.  **Node.js** (v20 or higher recommended).
2.  **Google Cloud API Credentials** (See Configuration).
3.  **Binaries:** You must download `yt-dlp.exe` and `ffmpeg.exe`.

### 1. Clone the Repository
git clone https://github.com/Jigen-Ohtsusuki/ViTube.git
cd ViTube

### 2. Install Dependencies
npm install

### 3. Configure Environment
Create a `authManager.template.js` to `authManager.js` file in the `electron` directory:
```sh
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:8080';
const HARDCODED_API_KEYS = [
    'YOUR_API_KEY_1',
    'YOUR_API_KEY_2',
    // ...
];
```
add your creds here


### 4. Setup Binaries (CRITICAL)
Create an `assets` folder in the root directory and place the following files inside:
- `assets/yt-dlp.exe`
- `assets/ffmpeg.exe`
- `assets/ffprobe.exe`

> **Note:** These files are too large for GitHub and are ignored by git. You must provide them locally.

### 5. Run Development Server
```
npm run dev
```

---

## 📦 Building for Production

To create a standalone `.exe` installer for Windows:

```
npm run build
```

The installer will be generated in the `dist_electron` folder.

---

## 🔐 Google API Configuration

To use ViTube, you need your own API keys to bypass quota limits.

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  Enable **YouTube Data API v3**.
4.  Create **OAuth 2.0 Client IDs** (Select "Desktop App").
5.  Create an **API Key**.
6.  Add your email to the "Test Users" list in the OAuth Consent Screen.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/Jigen-Ohtsusuki/ViTube/issues).

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

Built with ❤️ by @Jigen-Ohtsusuki
