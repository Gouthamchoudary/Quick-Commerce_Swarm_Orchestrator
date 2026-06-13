"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Warehouse, Database, Cpu, GitBranch, Github } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState(false);

  // Check backend health periodically
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("http://localhost:8000/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: "ping", picker_count: 1 }),
        });
        if (res.ok) {
          setApiOnline(true);
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
            <span>{apiOnline ? "FastAPI Active" : "Local Sandbox"}</span>
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
