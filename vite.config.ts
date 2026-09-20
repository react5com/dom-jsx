import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: 'terser',
    lib: {
      entry: {
        index: 'src/index.ts',
        'jsx-runtime': 'src/jsx-runtime.ts',
        'jsx-dev-runtime': 'src/jsx-dev-runtime.ts'
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    emptyOutDir: true
  }
})
