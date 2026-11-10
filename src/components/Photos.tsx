// Fotos salvas no IndexedDB: miniatura e visualização em tela cheia (setas trocam, Esc fecha).
import { useEffect } from 'react';
import Icon from './Icon';
import { useImage } from '../store/images';

export function Photo({ id, alt, className, onClick }: { id: string; alt: string; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  const url = useImage(id);
  return url ? <img src={url} alt={alt} className={className} onClick={onClick} loading="lazy" /> : <span className={`${className || ''} img-loading`} />;
}

export function Lightbox({ ids, index, onChange, onClose }: { ids: string[]; index: number; onChange: (i: number) => void; onClose: () => void }) {
  const n = ids.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChange((index + 1) % n);
      if (e.key === 'ArrowLeft') onChange((index - 1 + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, n, onChange, onClose]);
  return (
    <div className="race-lightbox" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <Photo id={ids[index]} alt={`Foto ${index + 1}`} />
      {n > 1 && (
        <>
          <button className="race-lb-nav left" onClick={(e) => { e.stopPropagation(); onChange((index - 1 + n) % n); }} aria-label="Foto anterior"><Icon name="left" size={28} /></button>
          <button className="race-lb-nav right" onClick={(e) => { e.stopPropagation(); onChange((index + 1) % n); }} aria-label="Próxima foto"><Icon name="right" size={28} /></button>
        </>
      )}
      <span className="race-lb-count">{index + 1} / {n}</span>
    </div>
  );
}
