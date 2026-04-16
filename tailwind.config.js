/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f8f3ea",
        plum: "#5b2245",
        wine: "#7a284d",
        gold: "#d0a86e",
        night: "#09090f",
        ember: "#f08a5d",
      },
      boxShadow: {
        glow: "0 20px 80px rgba(122, 40, 77, 0.35)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top, rgba(208,168,110,0.16), transparent 40%), radial-gradient(circle at 20% 20%, rgba(122,40,77,0.28), transparent 30%), linear-gradient(180deg, rgba(9,9,15,0.98), rgba(9,9,15,0.94))",
      },
    },
  },
  plugins: [],
};
