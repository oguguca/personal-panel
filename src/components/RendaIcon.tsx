// Logo da Renda (Hub) na cor do texto, igual aos outros ícones: a imagem vira só o formato (máscara).
// O caminho fica no style (relativo à página) para funcionar também no app instalado (file://).
const MASK = 'url(./renda.png) center / contain no-repeat';

export default function RendaIcon({ size = 20 }: { size?: number }) {
  return <span className="renda-icon" style={{ width: size, height: size, WebkitMask: MASK, mask: MASK }} aria-hidden="true" />;
}
