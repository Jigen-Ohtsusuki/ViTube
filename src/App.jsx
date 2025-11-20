import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
// Importing from Tabler Icons - sharper, more technical look
import { IconMinus, IconSquare, IconCopy, IconX, IconTerminal2 } from '@tabler/icons-react';
import Sidebar from './UI/components/Sidebar';
import SearchBar from './UI/components/SearchBar';
import LoginScreen from './UI/components/LoginScreen';
import GlobalPlayer from './UI/components/GlobalPlayer';

// Pages
import HomePage from './UI/pages/HomePage';
import SubscriptionsPage from './UI/pages/SubscriptionsPage';
import LibraryPage from './UI/pages/LibraryPage';
import SettingsPage from './UI/pages/SettingsPage';
import ChannelPage from './UI/pages/ChannelPage';
import PlaylistPage from './UI/pages/PlaylistPage';
import SearchPage from './UI/pages/SearchPage';
import WatchPagePlaceholder from './UI/pages/WatchPagePlaceholder';

function App() {
    const [version, setVersion] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (window.api) {
            window.api.getVersion().then(setVersion);
            window.api.checkAuth().then(isAuth => {
                setIsLoggedIn(isAuth);
                setIsCheckingAuth(false);
            });

            // Window State Management
            window.api.isMaximized().then(setIsMaximized);

            const onMax = () => setIsMaximized(true);
            const onUnmax = () => setIsMaximized(false);

            window.api.onMaximized(onMax);
            window.api.onUnmaximized(onUnmax);

            return () => {
                window.api.removeWindowListeners();
            };
        } else {
            setIsCheckingAuth(false);
        }
    }, []);

    const handleLogin = async () => {
        try {
            const result = await window.api.login();
            if (result.success) {
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Window Control Handlers
    const handleMinimize = () => window.api.minimizeWindow();
    const handleMaximize = () => {
        window.api.maximizeWindow();
        setIsMaximized(!isMaximized);
    };
    const handleClose = () => window.api.closeWindow();

    const HudButton = ({ onClick, icon: Icon, type }) => {
        const baseStyle = "relative h-full w-12 flex items-center justify-center -skew-x-[20deg] border-l border-[#b9baa3]/10 transition-all duration-200 group overflow-hidden";

        let hoverStyle = "hover:bg-[#b9baa3]/10 hover:border-[#b9baa3]/30";
        let iconColor = "text-[#b9baa3] group-hover:text-[#d6d5c9]";

        if (type === 'close') {
            hoverStyle = "hover:bg-[#a22c29] hover:border-[#a22c29] hover:shadow-[0_0_15px_#a22c29]";
            iconColor = "text-[#b9baa3] group-hover:text-white";
        } else if (type === 'max') {
            hoverStyle = "hover:bg-[#d6d5c9]/10 hover:border-[#d6d5c9]/50";
            iconColor = "text-[#b9baa3] group-hover:text-white";
        }

        return (
            <button onClick={onClick} className={`${baseStyle} ${hoverStyle}`}>
                {/* Counter-skew the icon so it stands up straight */}
                <div className={`skew-x-[20deg] ${iconColor} transition-colors`}>
                    <Icon size={16} stroke={1.5} />
                </div>
            </button>
        );
    };

    const TitleBar = () => (
        <div className="h-10 w-full flex justify-between items-center bg-[#0a100d] select-none z-50 px-0 border-b border-[#b9baa3]/5" style={{ WebkitAppRegion: 'drag' }}>

            {/* Left: Terminal Status Decoration */}
            <div className="flex-1 flex items-center gap-3 px-6 group">
                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                    <IconTerminal2 size={14} className="text-[#a22c29]" stroke={2} />
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#b9baa3] uppercase">
                        ViTube <span className="text-[#a22c29]">::</span> SHELL
                    </span>
                </div>
                {/* Decorative Data Line */}
                <div className="h-[2px] w-12 bg-[#b9baa3]/10 group-hover:w-24 group-hover:bg-[#a22c29]/50 transition-all duration-700"></div>
            </div>

            {/* Right: "MECHA" Window Controls */}
            {/* We add padding-right to account for the skew overlap */}
            <div className="flex items-stretch h-full pr-4" style={{ WebkitAppRegion: 'no-drag' }}>

                {/* Minimize */}
                <HudButton onClick={handleMinimize} icon={IconMinus} type="min" />

                {/* Maximize / Restore */}
                <HudButton
                    onClick={handleMaximize}
                    icon={isMaximized ? IconCopy : IconSquare}
                    type="max"
                />

                {/* Close (The Danger Button) */}
                <HudButton onClick={handleClose} icon={IconX} type="close" />

                {/* Closing cap for the angled design */}
                <div className="w-2 h-full bg-[#0a100d] border-l border-[#b9baa3]/10 -skew-x-[20deg]"></div>
            </div>
        </div>
    );

    if (isCheckingAuth) {
        return <div className="h-screen w-screen bg-[#0a100d] flex flex-col items-center justify-center text-[#b9baa3] font-mono tracking-widest uppercase text-xs"><div className="w-16 h-1 bg-[#a22c29] mb-4 animate-pulse"></div>SYSTEM INITIALIZING...</div>;
    }

    if (!isLoggedIn) {
        return (
            <>
                <div className="fixed top-0 left-0 right-0 z-50">
                    <TitleBar />
                </div>
                <div className="pt-10 h-screen">
                    <LoginScreen onLogin={handleLogin} />
                </div>
            </>
        );
    }

    return (
        <>
            <style>
                {`
                    ::-webkit-scrollbar { width: 6px; height: 6px; }
                    ::-webkit-scrollbar-track { background: #0a100d; }
                    ::-webkit-scrollbar-thumb { background: #a22c29; border-radius: 3px; }
                    ::-webkit-scrollbar-thumb:hover { background: #d6d5c9; }
                    .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #a22c29 #0a100d; }
                `}
            </style>

            <div className="flex flex-col h-screen w-screen bg-[#0a100d] text-[#d6d5c9] overflow-hidden font-sans selection:bg-[#a22c29] selection:text-white">

                {/* CUSTOM ANGLED TITLE BAR */}
                <TitleBar />

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 flex overflow-hidden p-2 gap-2 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#902923] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>

                    <Sidebar version={version} />

                    <div className="flex-1 flex flex-col h-full relative bg-[#0a100d]/80 rounded-2xl border border-[#b9baa3]/10 shadow-2xl overflow-hidden backdrop-blur-sm">
                        <header className="w-full p-4 flex-shrink-0 z-40 border-b border-[#b9baa3]/10 bg-[#0a100d]/90 backdrop-blur-md flex justify-between items-center">
                            <SearchBar />
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-[#a22c29] shadow-[0_0_10px_#a22c29] animate-pulse"></div>
                                <span className="text-[10px] font-mono text-[#b9baa3]/50 tracking-widest">ONLINE</span>
                            </div>
                        </header>

                        <main className="flex-1 overflow-y-auto p-6 pb-40 relative z-0 scroll-smooth custom-scrollbar">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                                <Route path="/library" element={<LibraryPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/channel" element={<ChannelPage />} />
                                <Route path="/playlist" element={<PlaylistPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/watch" element={<WatchPagePlaceholder />} />
                            </Routes>
                        </main>

                        <GlobalPlayer />
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;