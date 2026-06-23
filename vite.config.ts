import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { lodestoneDevApiPlugin } from './vite.lodestoneApiPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lodestoneDevApiPlugin()],
})
