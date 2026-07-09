import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        midnight: "#0b1020",
        cyanGlow: "#16e6ff",
        violetGlow: "#8b5cf6",
        softPanel: "rgba(255,255,255,0.08)"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(22, 230, 255, 0.16)",
        card: "0 20px 60px rgba(0,0,0,0.22)"
      }
    }
  },
  plugins: []
};

export default config;
