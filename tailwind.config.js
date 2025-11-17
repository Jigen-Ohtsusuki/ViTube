/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./index.html"
    ],
    theme: {
        extend: {
            colors: {
                yt: {
                    black: '#0f0f0f',
                    red: '#ff0000',
                    gray: '#272727'
                }
            }
        },
    },
    plugins: [],
}