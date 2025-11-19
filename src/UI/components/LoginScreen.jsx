import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function LoginScreen({ onLogin }) {
    const containerRef = useRef(null);
    useGSAP(() => { gsap.from(containerRef.current, { opacity: 0, scale: 0.9, duration: 1, ease: "expo.out" }); }, []);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a100d] text-[#d6d5c9] overflow-hidden relative font-mono">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#902923_0%,_transparent_70%)] opacity-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
            <div ref={containerRef} className="flex flex-col items-center z-10 relative p-12 border border-[#b9baa3]/10 bg-[#0a100d]/80 backdrop-blur-xl rounded-xl shadow-2xl">
                <div className="w-20 h-20 bg-[#a22c29] rounded flex items-center justify-center text-[#d6d5c9] font-black text-4xl shadow-[0_0_30px_#a22c29] mb-8">V</div>
                <h1 className="text-4xl font-black mb-2 tracking-tighter text-[#d6d5c9] font-sans">ViTube</h1>
                <p className="text-[#b9baa3] text-xs mb-8 tracking-[0.3em] uppercase">Secure Uplink Ready</p>
                <button onClick={onLogin} className="px-8 py-4 bg-[#d6d5c9] text-[#0a100d] rounded text-xs font-bold transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] flex items-center gap-3 uppercase tracking-widest">Initialize Session</button>
            </div>
        </div>
    );
}
export default LoginScreen;