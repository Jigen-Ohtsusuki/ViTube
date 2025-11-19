import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store';

function WatchPagePlaceholder() {
    const [searchParams] = useSearchParams();
    const vParam = searchParams.get('v');
    const audioParam = searchParams.get('audio') === 'true';
    const { playVideo, currentVideoId, isAudioMode } = useAppStore();
    useEffect(() => { if (vParam && (vParam !== currentVideoId || audioParam !== isAudioMode)) playVideo(vParam, audioParam); }, [vParam, audioParam]);
    return null;
}
export default WatchPagePlaceholder;