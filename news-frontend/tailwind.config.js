/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                black: "#050505", // Deep black
                surface: "#111111", // Slightly lighter for cards
                border: "#27272a", // Neutral 800ish
                accent: "#3b82f6", // Blue
                muted: "#a1a1aa", // Neutral 400
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                mono: ['Space Grotesk', 'monospace'],
            },
        },
    },
    plugins: [],
}
