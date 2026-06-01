import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    // Base path — для деплоя на Vercel в корень домена
    base: '/',

    // Настройки сборки
    build: {
        // Выходная директория (Vercel будет использовать её)
        outDir: 'dist',

        // Очищать dist перед сборкой
        emptyOutDir: true,

        // Не генерировать sourcemap в production (меньше размер)
        sourcemap: false,

        // Настройки Rollup
        rollupOptions: {
            output: {
                // Хеши в именах файлов для кэширования
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            }
        }
    },

    // Сервер для разработки
    server: {
        port: 3000,
        open: true
    },

    // Плагины
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'favicon.ico', dest: '.' },
                { src: 'icons/*', dest: 'icons' }
            ]
        })
    ]
});