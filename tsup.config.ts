import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { resolve: true },
  external: ['react', 'react-dom', 'react-moveable'],
  clean: true,
});
