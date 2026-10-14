import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Project site: https://zhang-hl-1.github.io/toefl-study/
export default defineConfig({
  base: "/toefl-study/",
  plugins: [react()],
})
