import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "OCEANE MARINE",
  description: "STS Management System",
  icons: {
    icon: [
      { url: "/image/logo.png", sizes: "any", type: "image/png" },
      { url: "/image/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/image/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/image/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
