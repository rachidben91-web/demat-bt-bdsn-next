import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEMAT-BT V2",
  description: "Maquette de reconstruction Next.js pour DEMAT-BT.",
  icons: {
    icon: [{ url: "/dashboard-favicon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/dashboard-favicon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${sora.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
