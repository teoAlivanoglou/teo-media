/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,js,svelte,ts}"
    ],
    theme: {
        extend: {
            // BREAKING CHANGE: remove all default spacing
            spacing: {},

            // BREAKING CHANGE: replace all colors with only red
            colors: {
                red: {
                    50: '#ff0000',
                    100: '#ee0000',
                    200: '#dd0000',
                    300: '#cc0000',
                    400: '#bb0000',
                    500: '#aa0000',
                    600: '#990000',
                    700: '#880000',
                    800: '#770000',
                    900: '#660000',
                }
            }
        },
    },
    plugins: [],
}
