import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "./Navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Q-Commerce Picking Orchestrator",
  description: "A transparent quick-commerce simulation using LangGraph orchestration, optional LLM order extraction, deterministic routing, and rule-based safety checks.",
  keywords: "Quick Commerce, LangGraph, LangChain, FastAPI, Next.js, LLM orchestration, route optimization",
  authors: [{ name: "Your Name Here" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div className="layout-content">
          {children}
        </div>
      </body>
    </html>
  );
}
