import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  GitBranch,
  Search,
  ShieldCheck,
  Route,
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
    title: "Order capture",
    icon: Search,
    text: "A basket description enters the system through the dashboard or API.",
  },
  {
    title: "Intent extraction",
    icon: BrainCircuit,
    text: "The parser converts natural language into structured SKUs and quantities.",
  },
  {
    title: "Inventory check",
    icon: ShieldCheck,
    text: "Stock, location, and safety rules are validated against the warehouse model.",
  },
  {
    title: "Swarm routing",
    icon: Route,
    text: "The orchestrator compares FIFO against a split-picker plan and picks the better path.",
  },
  {
    title: "Response output",
    icon: Sparkles,
    text: "The result is rendered as routes, alerts, and operational metrics that are easy to present.",
  },
];

const agentCards = [
  {
    title: "Order Intelligence Agent",
    icon: BrainCircuit,
    color: "var(--blue)",
    points: ["Reads free-form basket text", "Maps aliases to SKUs", "Handles deterministic fallback"],
  },
  {
    title: "Routing Agent",
    icon: Route,
    color: "var(--mint)",
    points: ["Builds FIFO baseline", "Splits work across pickers", "Minimizes critical path"],
  },
  {
    title: "Safety Agent",
    icon: ShieldCheck,
    color: "var(--gold)",
    points: ["Flags risky item adjacency", "Checks missing stock", "Explains rule hits clearly"],
  },
  {
    title: "Swarm Coordinator",
    icon: Workflow,
    color: "var(--coral)",
    points: ["Assigns picker routes", "Tracks route status", "Returns the final execution payload"],
  },
];

const subsystemCards = [
  {
    title: "LLM extraction layer",
    icon: Bot,
    text: "Used when language is ambiguous and a smarter interpretation is helpful.",
  },
  {
    title: "Deterministic fallback",
    icon: ListChecks,
    text: "Keeps the demo stable so the same input always produces the same output.",
  },
  {
    title: "PostgreSQL schema",
    icon: Database,
    text: "Documents how the system would persist inventory, orders, pickers, and tasks.",
  },
  {
    title: "Operational telemetry",
    icon: Layers3,
    text: "Surfaces route timing, alerts, and picker progress for a live explanation.",
  },
];

export default function ArchitecturePage() {
  return (
    <main className="app-shell architecture-page" style={{ padding: "28px 0 36px" }}>
      <section className="masthead architecture-hero">
        <div>
          <p className="eyebrow">Q-Swarm explanation</p>
          <h1>How Quick Commerce Swarm Works</h1>
          <p className="subhead">
            A single page for walking through the system end to end: order intake, AI parsing,
            safety checks, routing, and the final swarm execution view.
          </p>
          <div className="hero-tech-pills">
            <span><Warehouse size={14} /> Warehouse simulation</span>
            <span><GitBranch size={14} /> Agent orchestration</span>
            <span><BrainCircuit size={14} /> AI subsystems</span>
            <span><ShieldCheck size={14} /> Safety rules</span>
          </div>
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
              <div key={step.title} className="flow-step">
                <div className="flow-icon" style={{ color: index === 1 ? "var(--blue)" : index === 2 ? "var(--gold)" : index === 3 ? "var(--mint)" : "var(--coral)" }}>
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
        <aside className="architecture-sidebar">
          <article className="erd-card architecture-panel architecture-callout">
            <p className="architecture-kicker">Why it works</p>
            <h2>Clear responsibilities</h2>
            <p>
              Parsing, safety, routing, and presentation each do one job. That makes the system
              easier to explain, easier to debug, and easier to trust in a live demo.
            </p>
          </article>

          <article className="erd-card architecture-panel architecture-callout dark">
            <p className="architecture-kicker">Demo focus</p>
            <h2>What matters to an interviewer</h2>
            <p>
              The value is in the flow: detect intent, validate inventory, route the swarm, and
              surface the result with enough context to be auditable.
            </p>
          </article>
        </aside>
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
