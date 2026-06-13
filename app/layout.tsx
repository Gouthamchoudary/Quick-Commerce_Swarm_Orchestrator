import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q-Commerce Swarm Orchestrator",
  description: "Single-store dark-store swarm routing sandbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

