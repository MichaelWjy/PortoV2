import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fredoka, Inter_Tight, JetBrains_Mono, Syne } from "next/font/google";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["400", "500", "600"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["800"] });
// Journey map only: the rounded game-UI voice of the overworld.
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Michael Wijaya", template: "%s | Michael Wijaya" },
  // Tab icons follow the browser's colour scheme (the tab strip), not the site theme.
  icons: {
    icon: [
      { url: "/icon-light.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = { themeColor: "#050506", viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Dark is the default; light is opt-in and remembered in a cookie so the server renders the right theme.
  const light = (await cookies()).get(THEME_COOKIE)?.value === "light";
  return (
    <html lang="en" data-theme={light ? "light" : undefined} className={`${interTight.variable} ${jetbrainsMono.variable} ${syne.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
