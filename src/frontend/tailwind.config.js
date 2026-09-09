/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0D1219", soft: "#232b38" },
        paper: { DEFAULT: "#f4f7f6", raised: "#ffffff", column: "#eef3f0" },
        line: "rgba(13,18,25,0.08)",
        text: { DEFAULT: "#0D1219", mute: "#5B6472" },
        accent: {
          approve: "#34E7C6",
          progress: "#0E9C86",
          reject: "#E24B4A",
          info: "#0E9C86"
        }
      },
      fontFamily: {
        ui: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      }
    }
  },
  plugins: []
};
