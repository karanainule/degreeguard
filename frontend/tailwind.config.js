/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f0f4ff',100:'#dbe4ff',200:'#bac8ff',300:'#91a7ff',400:'#748ffc',500:'#5c7cfa',600:'#4c6ef5',700:'#4263eb',800:'#3b5bdb',900:'#364fc7',950:'#1e3a8a' },
        danger: { 50:'#fff5f5',400:'#ff6b6b',500:'#fa5252',600:'#f03e3e',700:'#e03131' },
        success: { 50:'#ebfbee',400:'#51cf66',500:'#40c057',600:'#37b24d' },
        warning: { 50:'#fff9db',400:'#ffd43b',500:'#fcc419',600:'#fab005' },
        slate: { 850:'#172033',950:'#0b1120' },
      },
      fontFamily: {
        display: ['"DM Sans"','system-ui','sans-serif'],
        body: ['"IBM Plex Sans"','system-ui','sans-serif'],
        mono: ['"JetBrains Mono"','monospace'],
      },
    },
  },
  plugins: [],
}

