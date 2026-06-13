import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "./Navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Q-Commerce Swarm Orchestrator | AI Resume Project",
  description: "A decentralized AI system demonstrating multi-agent routing, NLP order parsing, and computer vision anomaly detection for high-density dark stores.",
  keywords: "Quick Commerce, AI, Swarm Intelligence, Reinforcement Learning, Next.js, FastAPI, Machine Learning Portfolio",
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

