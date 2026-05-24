"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts";

const STATUS_COLOR: Record<string, string> = {
  conforme: "#10b981",
  non_conforme: "#ef4444",
  scaduta: "#ef4444",
  non_avviata: "#64748b",
  in_corso: "#eab308",
  completata: "#10b981",
  bloccata: "#ef4444",
  valido: "#10b981",
  mancante: "#ef4444",
  scaduto: "#f97316",
  obsoleto: "#64748b",
  minore: "#3b82f6",
  maggiore: "#f97316",
  critica: "#ef4444",
  attiva: "#10b981",
  sana: "#10b981",
  attenzione: "#eab308",
  critico: "#ef4444",
  blocco: "#0a0a0a",
};

function scoreColor(s: number) {
  if (s >= 90) return "#10b981";
  if (s >= 75) return "#06b6d4";
  if (s >= 60) return "#eab308";
  if (s >= 40) return "#f97316";
  return "#ef4444";
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
};

export function CompanyScoreChart({ data }: { data: Array<{ name: string; score: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" height={50} />
        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={scoreColor(entry.score)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusDonut({ data, title }: { data: Array<{ name: string; value: number }>; title?: string }) {
  const colors = data.map((d) => STATUS_COLOR[d.name.toLowerCase().replace(/\s/g, "_")] ?? "#94a3b8");
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-leo-muted">Nessun dato</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PunctualityBars({ data }: { data: Array<{ name: string; in_tempo: number; in_ritardo: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
        <Bar dataKey="in_tempo" stackId="a" fill="#10b981" name="In tempo" />
        <Bar dataKey="in_ritardo" stackId="a" fill="#ef4444" name="In ritardo" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data }: { data: Array<{ date: string; score: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
