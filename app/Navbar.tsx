"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Warehouse, Database, Cpu, GitBranch, Github } from "lucide-react";
import { useState, useEffect } from "react";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

export default function Navbar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState(false);
  const [aiMode, setAiMode] = useState("local fallback");

  // Check backend health periodically
  useEffect(() => {
    async function checkHealth() {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        setApiOnline(false);
        setAiMode("browser fallback");
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (res.ok) {
          setApiOnline(true);
          const health = await res.json() as { mode?: string };
          setAiMode(health.mode ?? "local fallback");
        } else {
          setApiOnline(false);
        }
      } catch {
        setApiOnline(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Simulation Dashboard", path: "/", icon: <Warehouse size={18} /> },
    { name: "Agent Architecture", path: "/architecture", icon: <GitBranch size={18} /> },
    { name: "AI Subsystems", path: "/models", icon: <Cpu size={18} /> },
    { name: "SQL Schema (3NF)", path: "/schema", icon: <Database size={18} /> },
  ];

  return (
    <header className="global-navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-logo">
          <div className="logo-icon-wrapper">
            <Warehouse size={20} />
          </div>
          <div className="logo-text">
            <strong>Q-Swarm</strong>
            <span>Orchestrator</span>
          </div>
        </Link>

        <nav className="navbar-links">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                {item.icon}
                <span>{item.name}</span>
                {isActive && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="navbar-status">
          <div className="status-indicator" title={apiOnline ? "FastAPI Backend Connected" : "Local Browser Fallback Active"}>
            <span className={`pulse-dot-nav ${apiOnline ? "online" : "offline"}`} />
            <span>{apiOnline ? aiMode : "Browser fallback"}</span>
          </div>
          <a
            href="https://github.com/Gouthamchoudary/Quick-Commerce_Swarm_Orchestrator"
            target="_blank"
            rel="noopener noreferrer"
            className="github-btn"
            aria-label="View source on GitHub"
          >
            <Github size={16} />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
