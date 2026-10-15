import React, { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { X, Download, ExternalLink } from 'lucide-react';

export const MediaLightbox = () => {
  const { lightboxMedia, setLightboxMedia } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && lightboxMedia) {
        setLightboxMedia(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxMedia, setLightboxMedia]);

  if (!lightboxMedia) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      {/* Top action bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <a
          href={lightboxMedia.url}
          target="_blank"
          rel="noreferrer"
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-slate-700 shadow-xl"
          title="Open in new tab"
        >
          <ExternalLink className="w-5 h-5" />
        </a>

        <a
          href={lightboxMedia.url}
          download={lightboxMedia.name}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-slate-700 shadow-xl"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>

        <button
          onClick={() => setLightboxMedia(null)}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-slate-700 shadow-xl"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media Image */}
      <div className="max-w-4xl max-h-[85vh] overflow-hidden flex items-center justify-center">
        <img
          src={lightboxMedia.url}
          alt={lightboxMedia.name || 'Attachment'}
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-slide-up"
        />
      </div>

      {/* Caption / Title */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 shadow-lg">
        {lightboxMedia.name}
      </div>
    </div>
  );
};
