import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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

    useEffect(() => {
        if (window.api) {
            window.api.getVersion().then(setVersion);
            window.api.checkAuth().then(isAuth => {
                setIsLoggedIn(isAuth);
                setIsCheckingAuth(false);
            });
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

    if (isCheckingAuth) {
        return <div className="h-screen w-screen bg-[#0a100d] flex flex-col items-center justify-center text-[#b9baa3] font-mono tracking-widest uppercase text-xs"><div className="w-16 h-1 bg-[#a22c29] mb-4 animate-pulse"></div>SYSTEM INITIALIZING...</div>;
    }

    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />;
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
            <div className="h-screen w-screen flex bg-[#0a100d] text-[#d6d5c9] overflow-hidden font-sans selection:bg-[#a22c29] selection:text-white p-2 gap-2">
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
        </>
    );
}

export default App;