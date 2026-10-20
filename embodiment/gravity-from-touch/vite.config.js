import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative, so the static build works under a sub-path (GitHub Pages)
  build: { target: 'esnext' }, // top-level await for RAPIER.init()
});
