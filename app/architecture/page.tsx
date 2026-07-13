import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  GitBranch,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Warehouse,
  Workflow,
  Bot,
  ListChecks,
  Database,
  Layers3,
} from "lucide-react";

const flowSteps = [
  {
    title: "Capture the order",
    icon: Search,
    text: "A natural-language basket arrives from the demo UI or API endpoint.",
  },
  {
    title: "Understand intent",
    icon: BrainCircuit,
    text: "The parser converts free text into structured SKUs, quantities, and confidence.",
  },
  {
    title: "Validate inventory",
    icon: ShieldCheck,
    text: "Stock, location, and safety rules are checked before any route is accepted.",
  },
  {
    title: "Split the work",
    icon: Route,
    text: "The orchestrator compares a FIFO baseline with a multi-picker swarm plan.",
  },
  {
    title: "Return the result",
    icon: Sparkles,
    text: "The dashboard shows routes, alerts, and timing in a format that is simple to explain.",
  },
];

const agentCards = [
  {
    title: "Order Intelligence",
    icon: BrainCircuit,
    color: "#2563eb",
    points: ["Reads basket text", "Maps aliases to SKUs", "Falls back deterministically"],
  },
  {
    title: "Routing Engine",
    icon: Route,
    color: "#0d9488",
    points: ["Builds FIFO baseline", "Balances picker load", "Reduces critical path"],
  },
  {
    title: "Safety Layer",
    icon: ShieldCheck,
    color: "#d97706",
    points: ["Checks missing stock", "Flags risky adjacency", "Keeps rule output explicit"],
  },
  {
    title: "Swarm Coordinator",
    icon: Workflow,
    color: "#e11d48",
    points: ["Assigns picker routes", "Tracks execution state", "Packages the final response"],
  },
];

const subsystemCards = [
  {
    title: "LLM extraction",
    icon: Bot,
    text: "Used when the order text is vague and the system needs a smarter interpretation.",
  },
  {
    title: "Deterministic parser",
    icon: ListChecks,
    text: "Keeps the same input stable across demos, tests, and repeat walkthroughs.",
  },
  {
    title: "Persistence model",
    icon: Database,
    text: "Defines how orders, inventory, pickers, and tasks map into PostgreSQL.",
  },
  {
    title: "Operational telemetry",
    icon: Layers3,
    text: "Shows route progress, alerts, and timing so the system stays easy to narrate.",
  },
];

const proofPoints = [
  "The flow is deterministic, so the demo behaves the same every time.",
  "Each stage has one responsibility, which keeps the system easy to reason about.",
  "The swarm plan is compared against FIFO, so the improvement is visible and measurable.",
  "The UI surfaces routes, safety checks, and metrics together, making the explanation complete.",
];

export default function ArchitecturePage() {
  return (
    <main className="app-shell architecture-page" style={{ padding: "28px 0 36px" }}>
      <section className="masthead architecture-hero">
        <div className="architecture-hero-copy">
          <p className="eyebrow">Q-Swarm explanation</p>
          <h1>How Quick Commerce Swarm Works</h1>
          <p className="subhead">
            This page is built to explain the project clearly in a live conversation: how an
            order becomes a route, how the swarm is coordinated, and why the result is reliable.
          </p>
          <div className="hero-tech-pills">
            <span><Warehouse size={14} /> Warehouse simulation</span>
            <span><GitBranch size={14} /> Agent orchestration</span>
            <span><BrainCircuit size={14} /> AI subsystems</span>
            <span><ShieldCheck size={14} /> Safety rules</span>
          </div>
        </div>

        <div className="architecture-hero-card">
          <span className="architecture-hero-label">What this page proves</span>
          <strong>The system is explainable, measurable, and demo-ready.</strong>
          <p>
            It shows the full chain from basket text to picker dispatch, with the swarm logic
            broken into steps that are easy to describe under interview pressure.
          </p>
        </div>
      </section>

      <section className="architecture-flow-card erd-card">
        <div className="architecture-section-header">
          <div>
            <p className="architecture-kicker">System flow</p>
            <h2>From basket text to swarm route</h2>
          </div>
          <div className="architecture-badge">
            <CheckCircle2 size={14} />
            Deterministic core
          </div>
        </div>

        <div className="architecture-flow">
          {flowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className={`flow-step flow-tone-${index + 1}`}>
                <div className="flow-icon">
                  <Icon size={18} />
                </div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
                {index < flowSteps.length - 1 && (
                  <div className="flow-arrow">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="architecture-grid">
        <article className="erd-card architecture-panel">
          <div className="architecture-section-header">
            <div>
              <p className="architecture-kicker">Agent stack</p>
              <h2>What each agent is responsible for</h2>
            </div>
          </div>

          <div className="architecture-card-grid">
            {agentCards.map((agent) => {
              const Icon = agent.icon;
              return (
                <section key={agent.title} className="architecture-mini-card">
                  <div className="architecture-mini-icon" style={{ background: agent.color }}>
                    <Icon size={18} />
                  </div>
                  <h3>{agent.title}</h3>
                  <ul>
                    {agent.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </article>

        <article className="erd-card architecture-panel architecture-proof-panel">
          <div className="architecture-section-header">
            <div>
              <p className="architecture-kicker">Why it feels solid</p>
              <h2>What the design guarantees</h2>
            </div>
          </div>

          <ul className="proof-list">
            {proofPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="architecture-grid lower">
        <article className="erd-card architecture-panel">
          <div className="architecture-section-header">
            <div>
              <p className="architecture-kicker">AI subsystems</p>
              <h2>How the AI portion fits in</h2>
            </div>
          </div>

          <div className="subsystem-grid">
            {subsystemCards.map((item) => {
              const Icon = item.icon;
              return (
                <section key={item.title} className="subsystem-card">
                  <div className="subsystem-icon">
                    <Icon size={16} />
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </section>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
