/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/**/*.{jsx,tsx}",
    "./src/components/agents-ui/agent-audio-visualizer-aura.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
