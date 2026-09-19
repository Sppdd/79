import type { Metadata, Viewport } from "next";
import { TabBar } from "@/components/ios/tab-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteReel",
  description: "An AI commercial studio — NVIDIA Nemotron directs, Nebius shoots.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NoteReel", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        {/* Phone-width column; on desktop it looks like the app running on a device. */}
        <div className="mx-auto min-h-dvh max-w-md bg-grouped pb-24">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
