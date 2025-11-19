import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';

function Sidebar({ version }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pipElement = useAppStore((state) => state.pipElement);

    const handleNavigate = async (to) => {
        if (document.pictureInPictureElement && pipElement) await document.exitPictureInPicture();
        navigate(to);
    };

    const isActive = (path) => location.pathname === path;
    const linkClass = (path) => `flex w-full items-center gap-4 text-xs font-bold uppercase tracking-widest p-4 rounded mb-1 text-left transition-all duration-300 border-l-2 ${isActive(path) ? 'border-[#a22c29] bg-[#a22c29]/10 text-[#d6d5c9]' : 'border-transparent text-[#b9baa3]/60 hover:text-[#d6d5c9] hover:bg-[#b9baa3]/5'}`;

    return (
        <nav className="w-64 flex-shrink-0 bg-[#0a100d] p-4 flex flex-col rounded-2xl border border-[#b9baa3]/10 shadow-2xl">
            <div className="flex items-center gap-3 px-2 mb-12 mt-4"><div className="w-8 h-8 bg-[#a22c29] rounded flex items-center justify-center text-[#d6d5c9] font-black text-lg shadow-[0_0_15px_#a22c29]">V</div><h1 className="text-2xl font-black tracking-tighter text-[#d6d5c9] font-sans">ViTube</h1></div>
            <div className="space-y-2">
                <button onClick={() => handleNavigate('/')} className={linkClass('/')}>Terminal</button>
                <button onClick={() => handleNavigate('/subscriptions')} className={linkClass('/subscriptions')}>Feeds</button>
                <button onClick={() => handleNavigate('/library')} className={linkClass('/library')}>Archives</button>
                <button onClick={() => handleNavigate('/settings')} className={linkClass('/settings')}>System</button>
            </div>
            <div className="flex-grow"></div>
            <div className="px-4 pb-4"><div className="h-px w-full bg-[#b9baa3]/10 mb-4"></div><span className="text-[8px] text-[#b9baa3]/30 font-mono uppercase tracking-[0.2em]">Build v{version} // STABLE</span></div>
        </nav>
    );
}
export default Sidebar;