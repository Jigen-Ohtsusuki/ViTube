import { useRef } from 'react';
import { useAppStore } from '../../store';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function SettingsPage() {
    const { autoplay, toggleAutoplay, sponsorBlockEnabled, toggleSponsorBlock } = useAppStore();
    const containerRef = useRef(null);
    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, y: 20, duration: 0.5 }); }, []);

    return (
        <div className="max-w-2xl" ref={containerRef}>
            <h2 className="text-xl font-bold mb-8 text-[#d6d5c9] font-mono tracking-widest">SYSTEM_CONFIG</h2>
            <div className="flex flex-col gap-4">
                <div className="bg-[#b9baa3]/5 p-6 rounded border border-[#b9baa3]/10 flex items-center justify-between">
                    <div><p className="font-bold text-sm text-[#d6d5c9] uppercase font-mono">Autoplay</p><p className="text-xs text-[#b9baa3] mt-1 font-mono">Auto-advance queue</p></div>
                    <button onClick={toggleAutoplay} className={`w-12 h-6 rounded-full border transition-all relative ${autoplay ? 'bg-[#a22c29]/20 border-[#a22c29]' : 'bg-transparent border-[#b9baa3]/30'}`}><div className={`w-4 h-4 bg-[#d6d5c9] rounded-full absolute top-0.5 transition-all ${autoplay ? 'left-7 bg-[#a22c29]' : 'left-1 bg-[#b9baa3]'}`}></div></button>
                </div>
                <div className="bg-[#b9baa3]/5 p-6 rounded border border-[#b9baa3]/10 flex items-center justify-between">
                    <div><p className="font-bold text-sm text-[#d6d5c9] uppercase font-mono">SponsorBlock</p><p className="text-xs text-[#b9baa3] mt-1 font-mono">Skip paid segments</p></div>
                    <button onClick={toggleSponsorBlock} className={`w-12 h-6 rounded-full border transition-all relative ${sponsorBlockEnabled ? 'bg-[#902923]/20 border-[#902923]' : 'bg-transparent border-[#b9baa3]/30'}`}><div className={`w-4 h-4 bg-[#d6d5c9] rounded-full absolute top-0.5 transition-all ${sponsorBlockEnabled ? 'left-7 bg-[#902923]' : 'left-1 bg-[#b9baa3]'}`}></div></button>
                </div>
            </div>
        </div>
    )
}
export default SettingsPage;