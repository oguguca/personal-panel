// Abre o Electron em modo de desenvolvimento.
// Remove ELECTRON_RUN_AS_NODE: o terminal do VS Code define essa variável,
// o que faria o Electron rodar como Node puro (sem janela).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const electronPath = createRequire(import.meta.url)('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
