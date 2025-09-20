import browserslist from 'browserslist';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('browserslist:', browserslist());
console.log('resolved caniuse-lite:', require.resolve('caniuse-lite/dist/unpacker/agents.js'));
