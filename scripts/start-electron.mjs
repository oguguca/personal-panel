// Abre o Electron em modo de desenvolvimento.
// Remove ELECTRON_RUN_AS_NODE: o terminal do VS Code define essa variável,
// o que faria o Electron rodar como Node puro (sem janela).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const electronPath = createRequire(import.meta.url)('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// Sem argumentos abre o app; com argumentos roda um script no Electron (ex.: scripts/build-exercises.cjs).
const args = process.argv.slice(2);
const child = spawn(electronPath, args.length ? args : ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
