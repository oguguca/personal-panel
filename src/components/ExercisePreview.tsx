// Prévia animada do exercício: alterna as fotos de início e fim do movimento (só CSS).
import IMAGES from '../data/exercise-images.json' with { type: 'json' };

const HAS = new Set<string>(IMAGES);
export const hasPreview = (id: string) => HAS.has(id);

export default function ExercisePreview({ id, name = '', size = 'thumb', onClick }: { id: string; name?: string; size?: string; onClick?: () => void }) {
  if (!HAS.has(id)) return null;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`ex-anim ${size}`} onClick={onClick} title={onClick ? 'Ver como fazer' : undefined} aria-label={onClick ? `Ver como fazer: ${name}` : undefined}>
      <img src={`./exercises/${id}-0.jpg`} alt={`${name}: posição inicial`} loading="lazy" decoding="async" />
      <img src={`./exercises/${id}-1.jpg`} alt={`${name}: posição final`} loading="lazy" decoding="async" />
    </Tag>
  );
}
