// Permite variáveis CSS (--alguma-coisa) no atributo style dos componentes.
import 'react';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
