import type { Metadata, Viewport } from "next";
import { Fredoka, Inter_Tight, JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["400", "500", "600"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["800"] });
// Journey map only: the rounded game-UI voice of the overworld.
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Michael Wijaya", template: "%s | Michael Wijaya" },
};

export const viewport: Viewport = { themeColor: "#050506", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable} ${syne.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
