import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { DebugPanel } from "@/components/ui/DebugPanel";

export const metadata: Metadata = {
  title: "PredictX — Trade on What Happens Next",
  description: "AI-powered prediction markets on Circle Arc Testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#0C0C0C",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <Providers>
          <div style={{ display: "flex", minHeight: "100vh" }}>

            {/* Sidebar fixed on left */}
            <div
              className="sidebar-desktop"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: 240,
                height: "100vh",
                zIndex: 40,
              }}
            >
              <Sidebar />
            </div>

            {/* Main content pushed right */}
            <div
              className="main-content"
              style={{
                marginLeft: 240,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                minWidth: 0,
                background: "#0C0C0C",
              }}
            >
              <Navbar />
              <main
                style={{
                  flex: 1,
                  padding: "28px 32px",
                  boxSizing: "border-box",
                  width: "100%",
                  maxWidth: 1280,
                }}
              >
                {children}
              </main>
              <Footer />
            </div>

          </div>
          <DebugPanel />
        </Providers>
      </body>
    </html>
  );
}
