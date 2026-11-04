import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  Code2,
  Zap,
  Radio,
  Activity,
  Crosshair,
  Shield,
  ShieldCheck,
  Briefcase,
  Calendar,
  MapPin,
  FolderGit2,
  ExternalLink,
  BookOpen,
  Database,
  TrendingUp,
  Server,
  Layout,
  Wrench,
  Mic,
  MicOff,
  Sliders,
  CheckCircle2,
  Share2,
  BarChart3,
  Network,
  GitBranch,
} from 'lucide-react';
import { sendChatMessage, getLocalData, getCandidateDisplayName } from '../services/api';
import { GithubIcon, LinkedinIcon } from './Icons';

// Native Web Audio API for subtle HUD audio feedback
function playHudSound(type = 'chirp') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'open') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'send') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'close') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.1);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// On-Demand Component 1: Interactive Multi-Axis Competency Radar Chart
// ---------------------------------------------------------------------------
function RadarSkillChart({ activeDomain = 'backend', onSelectDomain, skills = [] }) {
  const domains = useMemo(() => {
    if (skills && skills.length > 0) {
      const getCategorySkills = (catMatch) => {
        return skills
          .filter(s => (s.category || '').toLowerCase().includes(catMatch) || (s.name || '').toLowerCase().includes(catMatch))
          .map(s => s.name)
          .slice(0, 5)
          .join(', ');
      };
      const be = getCategorySkills('backend') || getCategorySkills('lang') || 'Python, APIs, Distributed Systems';
      const cl = getCategorySkills('cloud') || getCategorySkills('data') || 'Cloud Architecture, Microservices';
      const ai = getCategorySkills('ai') || getCategorySkills('gen') || 'System Architecture, Scalable Backends';
      const db = getCategorySkills('data') || getCategorySkills('sql') || 'Relational & Analytical Databases';
      const fe = getCategorySkills('front') || getCategorySkills('ui') || 'Modern Frontend, Dashboards, UI';

      return [
        { id: 'backend', name: 'Backend & Core', score: 96, tech: be, metrics: 'Sub-second API latency, resilient concurrency', color: '#06b6d4' },
        { id: 'cloud', name: 'Cloud & Big Data', score: 92, tech: cl, metrics: 'High-throughput analytical pipelines & warehouses', color: '#10b981' },
        { id: 'genai', name: 'AI & Architecture', score: 94, tech: ai, metrics: 'Deterministic verification & prompt caching', color: '#a855f7' },
        { id: 'database', name: 'Databases & Tuning', score: 95, tech: db, metrics: 'Query plan optimization & scalable indexing', color: '#f59e0b' },
        { id: 'frontend', name: 'Frontend & UI', score: 88, tech: fe, metrics: 'Reactive command centers & rich telemetry', color: '#3b82f6' },
      ];
    }
    return [
      { id: 'backend', name: 'Backend & Core', score: 96, tech: 'Python, FastAPI, Django, AsyncIO, REST', metrics: 'Sub-second API latency, resilient concurrency', color: '#06b6d4' },
      { id: 'cloud', name: 'Cloud & Big Data', score: 92, tech: 'Azure Synapse, PySpark, Databricks, Docker', metrics: 'High-throughput analytical pipelines & warehouses', color: '#10b981' },
      { id: 'genai', name: 'GenAI & Agents', score: 94, tech: 'LiteLLM, RAG, MCP Agents, Grounding Gates', metrics: 'Deterministic verification & prompt caching', color: '#a855f7' },
      { id: 'database', name: 'Databases & Tuning', score: 95, tech: 'PostgreSQL, BigQuery, HyperLogLog, Redis', metrics: 'Query plan optimization & 13x speedups', color: '#f59e0b' },
      { id: 'frontend', name: 'Frontend & UI', score: 88, tech: 'React JS, Tailwind CSS, Responsive Systems', metrics: 'Reactive command centers & rich telemetry', color: '#3b82f6' },
    ];
  }, [skills]);

  const cx = 150;
  const cy = 135;
  const radius = 95;
  const numAxes = domains.length;

  const getCoordinates = (index, factor = 1) => {
    const angle = (index * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = radius * factor;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridRings = [0.25, 0.5, 0.75, 1.0].map((factor) => {
    return domains
      .map((_, i) => {
        const { x, y } = getCoordinates(i, factor);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  const polygonPoints = domains
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.score / 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const currentSelection = domains.find((d) => d.id === activeDomain) || domains[0];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#060a17]/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-4 my-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
              COMPETENCY RADAR CHART
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              Evaluated multi-axis proficiency across 5 core engineering domains
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
          5 AXES EVALUATED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-6 flex items-center justify-center relative">
          <svg viewBox="0 0 300 270" className="w-full max-w-[280px] h-auto overflow-visible select-none">
            <defs>
              <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.65" />
                <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
              </radialGradient>
              <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {gridRings.map((pts, idx) => (
              <polygon
                key={idx}
                points={pts}
                fill="none"
                stroke="#1e293b"
                strokeWidth={idx === 3 ? '1.5' : '1'}
                strokeDasharray={idx < 3 ? '3 3' : undefined}
              />
            ))}

            {domains.map((_, i) => {
              const { x, y } = getCoordinates(i, 1);
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1e293b" strokeWidth="1" />;
            })}

            <g className="animate-radar-sweep origin-[150px_135px]">
              <line x1={cx} y1={cy} x2={cx} y2={cy - radius} stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.8" />
              <path
                d={`M ${cx} ${cy} L ${cx + 35} ${cy - radius + 15} A ${radius} ${radius} 0 0 0 ${cx} ${cy - radius} Z`}
                fill="rgba(6, 182, 212, 0.15)"
              />
            </g>

            <polygon
              points={polygonPoints}
              fill="url(#radarFillGrad)"
              stroke="#06b6d4"
              strokeWidth="2.2"
              filter="url(#radarGlow)"
              className="transition-all duration-700"
            />

            {domains.map((d, i) => {
              const { x, y } = getCoordinates(i, d.score / 100);
              const labelPos = getCoordinates(i, 1.25);
              const isSelected = activeDomain === d.id;

              return (
                <g
                  key={d.id}
                  onClick={() => onSelectDomain?.(d.id)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? '9' : '6'}
                    fill={isSelected ? d.color : '#0f172a'}
                    fillOpacity={isSelected ? '0.3' : '0.8'}
                    stroke={d.color}
                    strokeWidth="2"
                    className="transition-all duration-300 group-hover:scale-125"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? '4' : '2.5'}
                    fill={isSelected ? '#ffffff' : d.color}
                    className="transition-all duration-300"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#38bdf8' : '#94a3b8'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="transition-colors duration-200"
                  >
                    {d.name.split(' ')[0]} ({d.score}%)
                  </text>
                </g>
              );
            })}

            <circle cx={cx} cy={cy} r="3" fill="#06b6d4" />
          </svg>
        </div>

        <div className="md:col-span-6 space-y-2.5">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentSelection.color }} />
                {currentSelection.name}
              </span>
              <span className="text-xs font-mono font-extrabold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30">
                {currentSelection.score}%
              </span>
            </div>

            <div className="mt-2.5 space-y-1.5 text-xs font-mono">
              <div className="text-[11px] text-slate-300">
                <span className="text-slate-500">CORE STACK: </span>
                <span className="text-cyan-200">{currentSelection.tech}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                <span className="text-slate-500">BENCHMARK: </span>
                {currentSelection.metrics}
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${currentSelection.score}%`,
                    backgroundColor: currentSelection.color,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {domains.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectDomain?.(d.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border cursor-pointer ${
                  activeDomain === d.id
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {d.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// On-Demand Component 2: Latency Benchmark Graph
// ---------------------------------------------------------------------------
function LatencyBenchmarkChart() {
  const benchmarks = [
    {
      architecture: 'Standard LLM Call (No Caching)',
      latency: '29.2s',
      color: '#f43f5e',
      barPercent: 100,
      description: 'Full remote inference roundtrip + token streaming latency',
    },
    {
      architecture: 'LiteLLM Gateway + Prompt Caching',
      latency: '1.85s',
      color: '#38bdf8',
      barPercent: 16,
      description: 'Cached system prompts & model routing gateway',
    },
    {
      architecture: 'Input Hash Cache + Server Math Gate',
      latency: '0.65s',
      color: '#10b981',
      barPercent: 5.5,
      description: 'Deterministic hash hits & sub-second server-verified output',
    },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#060a17]/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-4 my-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              LATENCY COMPARISON BENCHMARK GRAPH
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              Uncached Direct Call vs Prompt Caching vs Input Hash Caching
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          ~45x SPEEDUP (-97.8% LATENCY)
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {benchmarks.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-200 font-semibold">{item.architecture}</span>
              <span className="font-extrabold" style={{ color: item.color }}>
                {item.latency}
              </span>
            </div>

            <div className="relative w-full h-4 rounded-lg bg-slate-950 overflow-hidden border border-slate-800 flex items-center p-0.5">
              <div
                className="h-full rounded-md transition-all duration-1000 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                style={{
                  width: `${item.barPercent}%`,
                  minWidth: '28px',
                  backgroundColor: item.color,
                }}
              />
              <span className="absolute right-2 text-[10px] font-mono text-slate-400">{item.latency}</span>
            </div>

            <p className="text-[10px] font-mono text-slate-400 pl-1">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>0.0s [INSTANT]</span>
        <span>10.0s</span>
        <span>20.0s</span>
        <span>30.0s [UNOPTIMIZED]</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// On-Demand Component 3: PostgreSQL Query Plan Tuning Graph
// ---------------------------------------------------------------------------
function QueryPlanComparisonChart() {
  const [metricTab, setMetricTab] = useState('time');

  const metricsData = {
    time: {
      unit: 'ms',
      before: 840,
      after: 3.2,
      reduction: '262x Faster',
    },
    buffers: {
      unit: 'pages',
      before: 14800,
      after: 42,
      reduction: '99.7% Reduction',
    },
    cost: {
      unit: 'cost units',
      before: 148200,
      after: 820,
      reduction: '99.4% Cost Drop',
    },
  };

  const active = metricsData[metricTab];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#060a17]/90 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)] space-y-4 my-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <TrendingUp className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              POSTGRESQL QUERY PLAN TUNING GRAPH
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              Sequential Table Scan vs Composite Bitmap Index Scan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMetricTab('time')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer ${
              metricTab === 'time' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            Duration
          </button>
          <button
            onClick={() => setMetricTab('buffers')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer ${
              metricTab === 'buffers' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            Buffers
          </button>
          <button
            onClick={() => setMetricTab('cost')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer ${
              metricTab === 'cost' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            Cost
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-rose-400 font-bold">1. Sequential Scan</span>
            <span className="text-[10px] text-slate-400">UNINDEXED</span>
          </div>
          <div className="text-2xl font-mono font-extrabold text-white">
            {active.before.toLocaleString()} <span className="text-xs font-normal text-slate-400">{active.unit}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div className="h-full rounded-full bg-rose-500 w-full" />
          </div>
          <p className="text-[10px] font-mono text-slate-400">Scans every row across disk segment.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold">2. Composite Index Scan</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              {active.reduction}
            </span>
          </div>
          <div className="text-2xl font-mono font-extrabold text-emerald-300">
            {active.after.toLocaleString()} <span className="text-xs font-normal text-slate-400">{active.unit}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${Math.max(4, (active.after / active.before) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-slate-400">Instant B-tree seek directly on index pages.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// On-Demand Component 4: HyperLogLog Memory Scaling Graph
// ---------------------------------------------------------------------------
function HllMemoryChart() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#060a17]/90 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)] space-y-4 my-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Database className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              MEMORY SCALING: EXACT SETS VS HYPERLOGLOG
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              O(N) Linear RAM Growth vs O(1) Fixed 1.5 KB Register
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          99.98% MEMORY SAVED AT 10M ITEMS
        </span>
      </div>

      <div className="relative pt-2">
        <svg viewBox="0 0 500 180" className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="exactGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="hllGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1="50" y1="20" x2="480" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="50" y1="65" x2="480" y2="65" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="50" y1="110" x2="480" y2="110" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="50" y1="155" x2="480" y2="155" stroke="#334155" />

          <text x="42" y="24" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">128MB</text>
          <text x="42" y="69" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">64MB</text>
          <text x="42" y="114" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">16MB</text>
          <text x="42" y="157" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">1.5KB</text>

          <path d="M 50 155 Q 260 140, 480 25 L 480 155 L 50 155 Z" fill="url(#exactGrad)" />
          <path d="M 50 155 Q 260 140, 480 25" fill="none" stroke="#f43f5e" strokeWidth="2.5" />

          <path d="M 50 152 L 480 152 L 480 155 L 50 155 Z" fill="url(#hllGrad)" />
          <line x1="50" y1="152" x2="480" y2="152" stroke="#10b981" strokeWidth="3" filter="drop-shadow(0 0 6px #10b981)" />

          <circle cx="480" cy="25" r="4.5" fill="#f43f5e" />
          <circle cx="480" cy="152" r="5" fill="#10b981" />

          <g transform="translate(320, 125)">
            <rect width="150" height="20" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <text x="75" y="13" fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              HLL CONSTANT 1.5 KB
            </text>
          </g>

          <text x="50" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">10K</text>
          <text x="155" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">100K</text>
          <text x="265" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">1M</text>
          <text x="375" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">10M</text>
          <text x="480" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">50M+ ITEMS</text>
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// On-Demand Component 5: Interactive System Architecture Flow Graph
// ---------------------------------------------------------------------------
function ArchitectureFlowGraph() {
  const [activeStep, setActiveStep] = useState(2);

  const steps = [
    {
      id: 0,
      title: 'Inbound Client Request',
      label: '1. API Call',
      tag: 'FASTAPI / REST',
      detail: 'Client requests analytical summaries with strict latency SLA and payload compression.',
      pattern: 'Gzip/Brotli payload compression + Bearer authentication gate',
    },
    {
      id: 1,
      title: 'LiteLLM Gateway & Cost Router',
      label: '2. Cost Router',
      tag: 'GATEWAY ROUTER',
      detail: 'Routes lightweight extraction tasks to fast models, reserving reasoning models for complex pipelines.',
      pattern: 'Model tiering + token caps + prompt caching for stable system schemas',
    },
    {
      id: 2,
      title: 'MCP Specialist Agents',
      label: '3. Tool Protocol',
      tag: 'MODEL CONTEXT PROTOCOL',
      detail: 'Autonomous tool invocations via Model Context Protocol (MCP) to fetch live database state.',
      pattern: 'Structured JSON schema tool arguments + parallel non-blocking execution',
    },
    {
      id: 3,
      title: 'Server Grounding Math Gate',
      label: '4. Math Check',
      tag: 'GROUNDING GATE',
      detail: 'Treats LLM purely as a writer. The server computes the numbers; regex extracts every figure from output.',
      pattern: 'Fail-closed verification: any unmatched figure triggers an immediate retry or rejection',
    },
    {
      id: 4,
      title: 'Input Hash Output Cache',
      label: '5. Deterministic Cache',
      tag: 'HASH CACHE',
      detail: 'Hashes structured input + prompt version + model name. Guarantees deterministic sub-second responses.',
      pattern: 'Hash key lookup in Redis/Memory: 29s latency ➔ 0.65s instant return',
    },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#060a17]/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-4 my-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Network className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              SYSTEM ARCHITECTURE PIPELINE FLOW
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              Click any node to inspect data pipeline schematics and security gates
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 relative">
        {steps.map((s, idx) => {
          const isSelected = activeStep === s.id;
          return (
            <div
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer relative text-center group ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/60'
              }`}
            >
              <span className="text-[9px] font-mono text-cyan-400/90 uppercase tracking-widest block">
                {s.label}
              </span>
              <h4 className="text-xs font-mono font-bold text-white mt-1 group-hover:text-cyan-200">
                {s.title.split(' ')[0]} {s.title.split(' ')[1] || ''}
              </h4>
              <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[8px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                {s.tag}
              </span>
              {idx < steps.length - 1 && (
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-cyan-400 font-bold text-xs pointer-events-none">
                  ➔
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            {steps[activeStep].title}
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
            STAGE {activeStep + 1} OF 5
          </span>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">{steps[activeStep].detail}</p>
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">PRODUCTION PATTERN:</span>
          <span className="text-cyan-200">{steps[activeStep].pattern}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown Table & Content Renderer
// ---------------------------------------------------------------------------
function FormattedContent({ text = '' }) {
  const clean = text.replace(/\[NAV:[a-zA-Z0-9_-]+\]/g, '').trim();
  const lines = clean.split('\n');
  const blocks = [];
  let currentTable = null;
  let textBuffer = [];

  for (let line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (textBuffer.length > 0) {
        blocks.push({ type: 'text', content: textBuffer.join('\n') });
        textBuffer = [];
      }
      if (!currentTable) currentTable = [];
      currentTable.push(line.trim());
    } else {
      if (currentTable) {
        blocks.push({ type: 'table', rows: currentTable });
        currentTable = null;
      }
      textBuffer.push(line);
    }
  }
  if (currentTable) blocks.push({ type: 'table', rows: currentTable });
  if (textBuffer.length > 0) blocks.push({ type: 'text', content: textBuffer.join('\n') });

  return (
    <div className="space-y-3 font-sans text-sm text-slate-200 leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          const headerCells = block.rows[0]
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean);
          const bodyRows = block.rows
            .slice(2)
            .map((r) =>
              r
                .split('|')
                .map((c) => c.trim())
                .filter(Boolean)
            )
            .filter((r) => r.length > 0);

          return (
            <div key={idx} className="overflow-x-auto my-3 rounded-xl border border-slate-800 bg-slate-950/90 shadow-md">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-cyan-300 border-b border-slate-800">
                  <tr>
                    {headerCells.map((h, i) => (
                      <th key={i} className="px-3.5 py-2.5 font-bold uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-slate-300">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div key={idx} className="whitespace-pre-line">
            {block.content}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intent Classifier: Decides Strictly On-Demand What Component is Needed
// ---------------------------------------------------------------------------
function determineVisualComponent(userQuery = '', text = '') {
  const q = userQuery.toLowerCase().trim();

  // 1. Explicit Charts & Visual Graphs (Strictly on-demand)
  if (/(radar|spider)/.test(q) || (/(competency|skill|proficiency)/.test(q) && /(chart|graph|radar)/.test(q))) {
    return 'chart-radar';
  }
  if (/(latency|speedup)/.test(q) && /(graph|chart|benchmark|comparison)/.test(q) || /(benchmark graph|latency graph)/.test(q)) {
    return 'chart-latency';
  }
  if (/(postgres|query plan|explain|tuning)/.test(q) && /(graph|chart|comparison|plan)/.test(q)) {
    return 'chart-postgres';
  }
  if (/(hyperloglog|hll|cardinality)/.test(q) || (/(memory)/.test(q) && /(curve|graph|chart|scaling)/.test(q))) {
    return 'chart-hll';
  }
  if (/(flow|diagram|pipeline)/.test(q) && /(architecture|system|data flow|agent|flowchart)/.test(q) || /(architecture flow|pipeline flow)/.test(q)) {
    return 'architecture-flow';
  }

  // 2. Component Boxes (Projects, Experience, Skills, Blog, Contact)
  if (/(project|projects|code|repo|repos|built|github)/.test(q)) {
    return 'projects';
  }
  if (/(experience|career|deloitte|pwc|tcs|tenure|company|companies|work history)/.test(q)) {
    return 'experience';
  }
  if (/(blog|blogs|article|articles|post|posts|publication|publications)/.test(q)) {
    return 'blog';
  }
  if (/(contact|email|hire|touch|reach out|linkedin|connect|message)/.test(q)) {
    return 'contact';
  }
  if (/(skill|skills|stack|tech stack|technologies|languages|frameworks|tools)/.test(q)) {
    return 'skills';
  }

  // 3. Fallback: Pure Text Only (No boxes, no charts, no clutter)
  return 'text';
}

// ---------------------------------------------------------------------------
// Dynamic Follow-Up Inquiry Suggestions
// ---------------------------------------------------------------------------
function getFollowUpSuggestions(componentType = 'text', text = '', name = 'Harsha') {
  switch (componentType) {
    case 'chart-radar':
      return [
        { label: 'What backend frameworks does ' + name + ' specialize in?', query: 'Tell me about ' + name + '\'s Python and FastAPI expertise' },
        { label: 'Show production projects built with these skills', query: 'Show me ' + name + '\'s featured projects' },
        { label: 'Compare query latency in a benchmark graph', query: 'Compare query latency in a graph' },
      ];
    case 'chart-latency':
      return [
        { label: 'How does the server-side math grounding gate work?', query: 'How does the server math check work in code?' },
        { label: 'Show GenAI system architecture flow', query: 'Show GenAI system architecture flow' },
        { label: 'Read "Never Let the LLM Do the Math" schematics', query: 'Tell me about the Grounded Generation blog post' },
      ];
    case 'chart-postgres':
      return [
        { label: 'How does HyperLogLog count distinct users?', query: 'Show HyperLogLog memory curve' },
        { label: 'What composite index order was chosen?', query: 'What composite index order and query plan tips does ' + name + ' recommend?' },
        { label: 'Read "Fast, Safe, Reliable APIs" schematics', query: 'Tell me about the Backend Performance and Reliability post' },
      ];
    case 'chart-hll':
      return [
        { label: 'How are sketches unioned at query time?', query: 'How does HyperLogLog union sketches across locations and dates?' },
        { label: 'Show Postgres query plan comparison', query: 'Show Postgres query plan tuning comparison' },
        { label: 'Where has ' + name + ' applied big data systems?', query: 'Where has ' + name + ' worked in his career?' },
      ];
    case 'architecture-flow':
      return [
        { label: 'What were the LiteLLM prompt cache latency gains?', query: 'Compare query latency in a graph' },
        { label: 'How does the math verification gate work?', query: 'How does the server math check work in code?' },
        { label: 'Show featured GenAI projects', query: 'Show me ' + name + '\'s projects' },
      ];
    case 'projects':
      return [
        { label: 'Which project had the highest performance impact?', query: 'Which project had the highest scalability and performance impact?' },
        { label: 'Show competency radar chart', query: 'Show the competency radar chart' },
        { label: 'How can I get in touch with ' + name + '?', query: 'How can I get in touch with ' + name + '?' },
      ];
    case 'experience':
      return [
        { label: 'What was ' + name + '\'s largest impact at Deloitte USI?', query: 'What was ' + name + '\'s core architectural impact at Deloitte USI?' },
        { label: 'What distributed pipelines were built at PwC?', query: 'What distributed data pipelines did ' + name + ' build at PwC AC India?' },
        { label: 'Show production projects', query: 'Show me ' + name + '\'s projects' },
      ];
    case 'skills':
      return [
        { label: 'Show competency radar chart', query: 'Show the competency radar chart' },
        { label: 'Show production projects', query: 'Show me ' + name + '\'s projects' },
        { label: 'Where has ' + name + ' worked in his career?', query: 'Where has ' + name + ' worked in his career?' },
      ];
    case 'blog':
      return [
        { label: 'What is the core takeaway of Grounded Generation?', query: 'What is the main architectural principle of Grounded LLM Generation?' },
        { label: 'Why is HyperLogLog preferred for analytics APIs?', query: 'Show HyperLogLog memory curve' },
        { label: 'Show GenAI architecture flow diagram', query: 'Show GenAI system architecture flow' },
      ];
    case 'contact':
      return [
        { label: 'What engineering roles is ' + name + ' open to?', query: 'What engineering roles and opportunities is ' + name + ' open to?' },
        { label: 'Review ' + name + '\'s production projects', query: 'Show me ' + name + '\'s projects' },
        { label: 'Where has ' + name + ' worked?', query: 'Where has ' + name + ' worked in his career?' },
      ];
    default:
      return [
        { label: 'Show featured projects', query: 'Show me ' + name + '\'s projects' },
        { label: 'Where has ' + name + ' worked?', query: 'Where has ' + name + ' worked in his career?' },
        { label: 'Show skills & competency radar', query: 'Show the competency radar chart' },
        { label: 'How to contact ' + name + '?', query: 'How can I get in touch with ' + name + '?' },
      ];
  }
}

// ---------------------------------------------------------------------------
// Follow-up Suggestions Component
// ---------------------------------------------------------------------------
function FollowUpSuggestions({ suggestions = [], onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="pt-3 border-t border-cyan-500/20 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
        <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
        <span>SUGGESTED FOLLOW-UP INQUIRIES:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item.query)}
            className="group px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-950/90 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-400/60 text-slate-300 hover:text-cyan-200 transition-all duration-200 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center gap-1.5 cursor-pointer text-left"
          >
            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform text-[11px]">▹</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Agent Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Iron Man Arc Reactor Core Animation (Initial Empty State)
// ---------------------------------------------------------------------------
function IronManArcReactor() {
  const coils = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => {
        const deg = i * 36;
        return { i, deg };
      }),
    []
  );

  return (
    <div className="relative flex items-center justify-center my-4 select-none group">
      {/* Outer Cyan Plasma Glow Aura */}
      <div className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none animate-pulse" />

      {/* Main Arc Reactor SVG Core */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center animate-reactor-glow transition-transform duration-500 group-hover:scale-105">
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <defs>
            {/* High-Energy Fusion Plasma Gradient */}
            <radialGradient id="arcPlasmaCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor="#cffafe" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#083344" stopOpacity="0.2" />
            </radialGradient>

            {/* Glowing Metal Casing Gradient */}
            <linearGradient id="arcCasingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Core Glow Filter */}
            <filter id="arcGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Metallic Ring Chassis */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="url(#arcCasingGrad)"
            stroke="#0891b2"
            strokeWidth="3"
            strokeOpacity="0.75"
          />

          {/* Secondary Concentric Grooved Rim */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="#164e63"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* 10 Radial Copper Induction Coils around circumference */}
          {coils.map(({ i, deg }) => (
            <g key={i} transform={'rotate(' + deg + ' 100 100)'}>
              {/* Metallic Coil Core */}
              <rect
                x="92"
                y="10"
                width="16"
                height="16"
                rx="2.5"
                fill="#071927"
                stroke="#06b6d4"
                strokeWidth="1.2"
              />
              {/* Copper Wire Windings */}
              <line x1="92" y1="14" x2="108" y2="14" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.85" />
              <line x1="92" y1="18" x2="108" y2="18" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.85" />
              <line x1="92" y1="22" x2="108" y2="22" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.85" />
            </g>
          ))}

          {/* Outer Segmented Gear Ring (Clockwise Rotation) */}
          <g className="animate-jarvis-spin origin-[100px_100px]">
            <circle
              cx="100"
              cy="100"
              r="69"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="18 10"
              strokeOpacity="0.9"
            />
            {/* North, South, East, West Sensor Dots */}
            <circle cx="100" cy="31" r="2.5" fill="#a5f3fc" />
            <circle cx="169" cy="100" r="2.5" fill="#a5f3fc" />
            <circle cx="100" cy="169" r="2.5" fill="#a5f3fc" />
            <circle cx="31" cy="100" r="2.5" fill="#a5f3fc" />
          </g>

          {/* Middle Dotted Tech Ring (Counter-Clockwise Rotation) */}
          <g className="animate-jarvis-spin-reverse origin-[100px_100px]">
            <circle
              cx="100"
              cy="100"
              r="56"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="8 6"
              strokeOpacity="0.8"
            />
            <circle
              cx="100"
              cy="100"
              r="47"
              fill="none"
              stroke="#0891b2"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
          </g>

          {/* Inverted Palladium Core Triangle Bracket */}
          <g className="origin-[100px_100px]">
            {/* Triangular Aperture Ring */}
            <circle
              cx="100"
              cy="100"
              r="40"
              fill="#030816"
              stroke="#06b6d4"
              strokeWidth="2.5"
              filter="url(#arcGlowFilter)"
            />

            {/* Iconic Inverted Triangle */}
            <polygon
              points="100,68 128,116 72,116"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeOpacity="0.95"
            />

            {/* Inner Radiating Struts */}
            <line x1="100" y1="100" x2="100" y2="68" stroke="#a5f3fc" strokeWidth="1.5" strokeOpacity="0.9" />
            <line x1="100" y1="100" x2="128" y2="116" stroke="#a5f3fc" strokeWidth="1.5" strokeOpacity="0.9" />
            <line x1="100" y1="100" x2="72" y2="116" stroke="#a5f3fc" strokeWidth="1.5" strokeOpacity="0.9" />
          </g>

          {/* Center Fusion Plasma Core Node (Pulsing) */}
          <g className="animate-jarvis-pulse origin-[100px_100px]">
            {/* Plasma Aura Disk */}
            <circle
              cx="100"
              cy="100"
              r="24"
              fill="url(#arcPlasmaCore)"
              filter="url(#arcGlowFilter)"
            />

            {/* Concentric Energy Filament */}
            <circle
              cx="100"
              cy="100"
              r="15"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />

            {/* Pure Radiant White Center */}
            <circle
              cx="100"
              cy="100"
              r="8"
              fill="#ffffff"
              filter="drop-shadow(0 0 10px #ffffff)"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function ChatWidget({
  isOpen: propIsOpen,
  setIsOpen: propSetIsOpen,
  portfolioData,
  profile: propProfile,
  experiences: propExperiences,
  projects: propProjects,
  skills: propSkills,
  posts: propPosts,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = propSetIsOpen || setInternalIsOpen;

  // Active data derived from portfolioData prop, individual props, or localStorage
  const activeData = portfolioData || getLocalData() || {};
  const profile = activeData.profile || propProfile || {};
  const experiences = activeData.experiences || propExperiences || [];
  const projects = activeData.projects || propProjects || [];
  const skills = activeData.skills || propSkills || [];
  const posts = activeData.posts || propPosts || [];

  const fullName = profile?.name?.trim() || 'Developer';
  const firstName = profile?.display_name || profile?.first_name || getCandidateDisplayName(fullName, profile?.email, profile?.linkedin_url);
  const agentName = `${firstName}'s Agent`;

  const [isFullScreen, setIsFullScreen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]); // Initially empty: pure search bar state
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeRadarDomain, setActiveRadarDomain] = useState('backend');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Keyboard shortcut Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          playHudSound(next ? 'open' : 'close');
          return next;
        });
      } else if (e.key === 'Escape' && isOpen) {
        if (selectedArticle) {
          setSelectedArticle(null);
        } else {
          setIsOpen(false);
          playHudSound('close');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedArticle]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      playHudSound('open');
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  }, [isOpen]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice Search / Dictation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          handleSend(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        playHudSound('send');
      } catch {
        setIsListening(false);
      }
    }
  };

  // Text-To-Speech Speech Synthesis
  const toggleSpeechSynthesis = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const clean = text.replace(/\[NAV:[a-zA-Z0-9_-]+\]/g, '').replace(/[#*`_~|]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Lock On in Portfolio Page
  const handleLockOnInPortfolio = (target) => {
    setIsOpen(false);
    playHudSound('close');

    const sectionId = target.replace('#', '');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add(
          'ring-2',
          'ring-cyan-400',
          'ring-offset-4',
          'ring-offset-[#050811]',
          'shadow-[0_0_60px_rgba(6,182,212,0.45)]',
          'transition-all',
          'duration-500'
        );
        setTimeout(() => {
          element.classList.remove(
            'ring-2',
            'ring-cyan-400',
            'ring-offset-4',
            'ring-offset-[#050811]',
            'shadow-[0_0_60px_rgba(6,182,212,0.45)]'
          );
        }, 2500);

        if (sectionId === 'contact') {
          setTimeout(() => {
            const firstInput = element.querySelector('input, textarea');
            if (firstInput) firstInput.focus();
          }, 600);
        }
      }
    }, 200);
  };

  // Send Query
  const handleSend = async (customQuery = null) => {
    const query = customQuery || input;
    if (!query.trim() || loading) return;

    playHudSound('send');

    const newMessages = [
      ...messages,
      { sender: 'user', text: query, timestamp: new Date() },
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(query, 'general', activeData);
      const reply = res.reply || `Synthesized information for "${query}".`;
      const componentType = determineVisualComponent(query, reply);

      setMessages([
        ...newMessages,
        {
          sender: 'agent',
          text: reply,
          timestamp: new Date(),
          componentType,
        },
      ]);
    } catch {
      const componentType = determineVisualComponent(query, '');
      setMessages([
        ...newMessages,
        {
          sender: 'agent',
          text: `Telemetry offline. Here is the local system dossier for ${firstName}:`,
          timestamp: new Date(),
          componentType,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render Visual Component Strictly On-Demand
  const renderVisualComponentOnDemand = (componentType) => {
    switch (componentType) {
      case 'chart-radar':
        return (
          <RadarSkillChart
            activeDomain={activeRadarDomain}
            onSelectDomain={setActiveRadarDomain}
            skills={skills}
          />
        );

      case 'chart-latency':
        return <LatencyBenchmarkChart />;

      case 'chart-postgres':
        return <QueryPlanComparisonChart />;

      case 'chart-hll':
        return <HllMemoryChart />;

      case 'architecture-flow':
        return <ArchitectureFlowGraph />;

      case 'projects':
        return (
          <div className="space-y-3 my-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" /> Production Repositories & Schematics
              </span>
              <button
                onClick={() => handleLockOnInPortfolio('projects')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>Lock On in Projects</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((proj) => {
                let bullets = [];
                try {
                  bullets = typeof proj.bullets === 'string' ? JSON.parse(proj.bullets) : proj.bullets || [];
                } catch {
                  bullets = [];
                }
                const techList = proj.tech_stack ? proj.tech_stack.split(',').map((t) => t.trim()) : [];

                return (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white">{proj.title}</h4>
                        {proj.featured && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 border border-cyan-500/40 text-cyan-300 shrink-0">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proj.description}</p>
                      {bullets.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {bullets.slice(0, 2).map((b, bIdx) => (
                            <div key={bIdx} className="text-[11px] text-slate-300 flex items-start gap-1.5 font-mono">
                              <span className="text-cyan-400 mt-0.5">▹</span>
                              <span className="line-clamp-1">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-800/80">
                      {techList.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {techList.slice(0, 4).map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {proj.github_url && (
                          <a
                            href={proj.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                          >
                            <GithubIcon className="w-3.5 h-3.5" />
                            <span>Source</span>
                          </a>
                        )}
                        {proj.live_url && (
                          <a
                            href={proj.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Demo</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-3 my-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Enterprise Milestones & Tenures
              </span>
              <button
                onClick={() => handleLockOnInPortfolio('experience')}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>Lock On in Experience</span>
              </button>
            </div>

            <div className="space-y-3">
              {experiences.map((exp) => {
                let bullets = [];
                try {
                  bullets = typeof exp.bullets === 'string' ? JSON.parse(exp.bullets) : exp.bullets || [];
                } catch {
                  bullets = [];
                }

                return (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h4 className="text-sm font-bold text-white">{exp.role}</h4>
                        <span className="text-xs font-mono font-bold text-emerald-400">{exp.company}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {exp.start_date} — {exp.end_date || 'Present'}
                      </span>
                    </div>

                    {bullets.length > 0 && (
                      <div className="space-y-1">
                        {bullets.slice(0, 2).map((b, bIdx) => (
                          <div key={bIdx} className="text-xs text-slate-300 flex items-start gap-1.5 font-sans">
                            <span className="text-emerald-400 font-mono mt-0.5">▹</span>
                            <span className="line-clamp-2">{b}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {exp.skills_text && (
                      <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                        <span className="text-slate-500">TECHNOLOGIES: </span>
                        {exp.skills_text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 my-2 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" /> Categorized Skills & Tooling
              </span>
              <button
                onClick={() => handleLockOnInPortfolio('skills')}
                className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>Lock On in Skills</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800/80 text-slate-300 hover:border-purple-400/40 transition-colors"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        );

      case 'blog':
        return (
          <div className="space-y-3 my-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Published Engineering Blueprints
              </span>
              <button
                onClick={() => handleLockOnInPortfolio('blog')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>Lock On in Blog</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                      {post.tags?.split(',')[0] || 'ENGINEERING'}
                    </span>
                    <h4 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{post.excerpt}</p>
                  </div>

                  <button
                    onClick={() => setSelectedArticle(post)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Schematics</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/30 space-y-3 my-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300">Direct Contact Transmission</span>
              <button
                onClick={() => handleLockOnInPortfolio('contact')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>Jump to Contact Form</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 font-sans">
              Connect directly with {firstName} for distributed systems architecture, cloud data pipelines, or engineering opportunities:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {profile?.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 hover:bg-cyan-500/30"
                >
                  <span>✉ {profile.email}</span>
                </a>
              )}
              {profile?.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 hover:bg-slate-700"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>GitHub Profile</span>
                </a>
              )}
              {profile?.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 hover:bg-blue-500/30"
                >
                  <LinkedinIcon className="w-3.5 h-3.5" />
                  <span>LinkedIn Network</span>
                </a>
              )}
            </div>
          </div>
        );

      default:
        // 'text' only: no boxes, no charts, pure clean text
        return null;
    }
  };

  const candidatePosts = useMemo(() => {
    const isHarsha = fullName.toLowerCase().includes('harsha');
    if (isHarsha) return posts;
    return (posts || []).filter(p => !p.content?.toLowerCase().includes('pyspark') && !p.content?.toLowerCase().includes('harsha'));
  }, [posts, fullName]);

  const topSkillName = skills && skills[0]?.name ? skills[0].name : null;

  const initialSuggestions = [
    { label: `Who is ${firstName}?`, query: `Who is ${firstName}?` },
    { label: `Show ${firstName}'s featured projects`, query: `Show me ${firstName}'s featured projects` },
    { label: `Where has ${firstName} worked?`, query: `Where has ${firstName} worked in career?` },
    { label: 'Show competency radar chart', query: 'Show the competency radar chart' },
    ...(topSkillName ? [{ label: `Tell me about ${firstName}'s ${topSkillName} skills`, query: `Tell me about ${firstName}'s ${topSkillName} background and projects` }] : []),
    { label: 'Show system architecture flow', query: 'Show system architecture flow' },
    { label: 'Compare query latency in a graph', query: 'Compare query latency in a graph' },
    ...(candidatePosts.length > 0 ? [{ label: `What technical blogs did ${firstName} write?`, query: `What technical blogs did ${firstName} write?` }] : []),
    { label: 'How can I get in touch?', query: `How can I get in touch with ${firstName}?` },
  ];

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* Launch Button: User Firstname + " Agent"             */}
      {/* ---------------------------------------------------- */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsOpen(true)}
            aria-label={`Open ${agentName}`}
            className="group cursor-pointer flex items-center gap-3 p-2.5 pr-4 rounded-full bg-[#050811]/90 backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_45px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:bg-cyan-900 transition-colors">
              <Search className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
                {agentName}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <span className="text-[9px] font-mono text-cyan-400/80 tracking-wider uppercase flex items-center gap-1">
                <span>PRESS</span>
                <kbd className="px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-[8px] text-cyan-300">
                  Ctrl+K
                </kbd>
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Full-Screen Search Engine Modal Canvas               */}
      {/* ---------------------------------------------------- */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isFullScreen
              ? 'inset-0 bg-[#030611]/98 backdrop-blur-3xl flex flex-col'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-full sm:w-[94vw] sm:max-w-5xl h-[92vh] rounded-2xl bg-[#050811]/98 border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.35)] flex flex-col overflow-hidden'
          }`}
        >
          {/* Top Bar Header */}
          <div className="px-4 sm:px-6 py-3 bg-[#060a17]/95 border-b border-cyan-500/20 flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-white tracking-wider">
                  {agentName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    playHudSound('chirp');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-cyan-300 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="New Search / Clear"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Search</span>
                </button>
              )}

              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                aria-label={isFullScreen ? 'Dock Window' : 'Full Screen'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                title={isFullScreen ? 'Dock Window' : 'Maximize Full Screen'}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  playHudSound('close');
                }}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900/60 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/50 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* INITIAL STATE: Clean Search Bar + Suggestions        */}
          {/* (NO charts, NO radar, NO boxes initially)            */}
          {/* ---------------------------------------------------- */}
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-3xl mx-auto w-full animate-fadeIn">
              <div className="w-full space-y-6 text-center">
                <div className="space-y-2">
                  <IronManArcReactor />
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                    {agentName}
                  </h2>
                  <p className="text-sm text-slate-400 font-sans max-w-lg mx-auto">
                    Ask anything about {firstName}'s engineering background, production projects, skills, or system architecture.
                  </p>
                </div>

                {/* Big Initial Search Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative flex items-center max-w-2xl mx-auto"
                >
                  <div className="absolute left-4 flex items-center text-cyan-400 pointer-events-none">
                    <Search className="w-5 h-5" />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask a question about ${firstName}...`}
                    className="w-full pl-12 pr-28 py-4 text-base font-sans rounded-2xl bg-slate-950/90 border border-cyan-500/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all"
                  />

                  <div className="absolute right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      aria-label="Voice Input"
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      aria-label="Search"
                      className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>SEARCH</span>
                    </button>
                  </div>
                </form>

                {/* Initial Quick Suggestion Pills */}
                <div className="pt-4 max-w-2xl mx-auto">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-3">
                    SUGGESTED EXPLORATION PATHS:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {initialSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(item.query)}
                        className="group px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-950/80 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center gap-1.5"
                      >
                        <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform text-[11px]">▹</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---------------------------------------------------- */
            /* CONVERSATION VIEWPORT: Active Search + Results       */
            /* ---------------------------------------------------- */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages & Results List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
                {messages.map((msg, index) => {
                  const isUser = msg.sender === 'user';

                  if (isUser) {
                    return (
                      <div key={index} className="flex justify-end animate-fadeIn">
                        <div className="max-w-2xl px-4 py-2.5 rounded-2xl rounded-tr-none bg-cyan-950/50 border border-cyan-500/40 text-cyan-100 text-sm font-mono shadow-[0_0_15px_rgba(6,182,212,0.1)] flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{msg.text}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="p-5 sm:p-6 rounded-2xl bg-[#060a17]/90 border border-cyan-500/25 shadow-lg space-y-4 animate-fadeIn"
                    >
                      {/* Response Header */}
                      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs font-mono font-bold text-white tracking-wider">
                            {agentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Text-To-Speech Button */}
                          <button
                            onClick={() => toggleSpeechSynthesis(msg.text)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                            title={isSpeaking ? 'Mute' : 'Listen'}
                          >
                            {isSpeaking ? (
                              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={() => copyToClipboard(msg.text, index)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Main Formatted Content (Text, Tables, Markdown) */}
                      <FormattedContent text={msg.text} />

                      {/* On-Demand Visual Component (Charts, Boxes, Graphs ONLY if query called for it) */}
                      {renderVisualComponentOnDemand(msg.componentType)}

                      {/* Dynamic Contextual Follow-Up Suggestions */}
                      <FollowUpSuggestions
                        suggestions={getFollowUpSuggestions(msg.componentType, msg.text, firstName, experiences, projects, skills)}
                        onSelect={(query) => handleSend(query)}
                      />
                    </div>
                  );
                })}

                {loading && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 flex items-center gap-2.5 text-cyan-400 font-mono text-xs animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Searching {firstName}'s knowledge base & synthesizing response...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Docked Bottom Search Bar */}
              <div className="px-4 sm:px-6 py-3 bg-[#050811]/90 border-t border-cyan-500/20 backdrop-blur-xl shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative flex items-center max-w-4xl mx-auto"
                >
                  <div className="absolute left-4 flex items-center text-cyan-400 pointer-events-none">
                    <Search className="w-4 h-4" />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask another question about ${firstName}...`}
                    className="w-full pl-11 pr-24 py-3 text-sm font-sans rounded-xl bg-slate-950/90 border border-cyan-500/30 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />

                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ASK</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* In-Place Article Reader Drawer                       */}
          {/* ---------------------------------------------------- */}
          {selectedArticle && (
            <div className="absolute inset-0 z-50 bg-[#050811]/98 backdrop-blur-3xl p-6 sm:p-10 overflow-y-auto flex flex-col justify-between animate-fadeIn">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between pb-4 border-b border-cyan-500/30 mb-6">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                      TECHNICAL PUBLICATION
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{selectedArticle.title}</h2>
                    {selectedArticle.tags && (
                      <div className="text-xs font-mono text-slate-400 mt-1">Tags: {selectedArticle.tags}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 font-sans whitespace-pre-line">
                  {selectedArticle.content}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="px-4 py-2 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    Close Reader
                  </button>
                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      handleLockOnInPortfolio('blog');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View In Blog Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
