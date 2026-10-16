import { defineConfig } from 'vite'

export default defineConfig({
    //define: { global: {} },
    base: process.env.VITE_BASE_PATH || './',
    define: {
        'process.env': {},
        // 'global.window': 'window'
        // global: {}
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis'
            }
        }
    }
})
