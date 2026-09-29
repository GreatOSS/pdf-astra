import { cpSync, mkdirSync } from 'node:fs';
// Serve all PDF.js resources locally, including CJK fonts and image decoders.
mkdirSync('public/pdfjs', { recursive: true });
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  cpSync(`node_modules/pdfjs-dist/${directory}`, `public/pdfjs/${directory}`, { recursive: true });
}
mkdirSync('public/licenses', { recursive: true });
for (const [packageName, licenseFile, output] of [
  ['pdfjs-dist', 'LICENSE', 'pdfjs-Apache-2.0.txt'],
  ['pdf-lib', 'LICENSE.md', 'pdf-lib-MIT.txt'],
  ['react', 'LICENSE', 'react-MIT.txt'],
  ['react-dom', 'LICENSE', 'react-dom-MIT.txt'],
  ['lucide-react', 'LICENSE', 'lucide-ISC.txt'],
]) {
  cpSync(`node_modules/${packageName}/${licenseFile}`, `public/licenses/${output}`);
}
