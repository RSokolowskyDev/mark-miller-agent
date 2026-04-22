import { useEffect, useMemo, useState } from "react";
import LeadCard from "./LeadCard";
import LeadBrief from "./LeadBrief";
import EmailLog from "./EmailLog";

const navItems = ["Pipeline", "All Leads", "Email Log"];

export default function App() {
  const [view, setView] = useState("Pipeline");
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || "http://localhost:8000", []);

  const fetchLeads = async () => {
    const response = await fetch(`${apiUrl}/leads`);
    if (!response.ok) return;
    const data = await response.json();
    setLeads(data);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchLeads();
    const id = setInterval(fetchLeads, 10000);
    return () => clearInterval(id);
  }, []);

  const columns = {
    new: "New",
    contacted: "Contacted",
    converted: "Converted",
  };

  const byStatus = (status) => leads.filter((lead) => (lead.status || "new") === status);
  const hotCount = leads.filter((lead) => (lead.tier || "").toLowerCase() === "hot").length;
  const warmCount = leads.filter((lead) => (lead.tier || "").toLowerCase() === "warm").length;
  const avgScore = leads.length
    ? Math.round(leads.reduce((sum, lead) => sum + (Number(lead.score) || 0), 0) / leads.length)
    : 0;

  const allEmails = leads.flatMap((lead) =>
    (lead.emails_sent || []).map((item) => ({
      leadName: lead.name,
      ...item,
    }))
  );

  return (
    <div className="flex min-h-screen bg-[#f3f6fb]">
      <aside className="w-56 border-r border-[#243250] bg-[#1a2744] p-4 text-white">
        <h1 className="text-base font-bold leading-tight">Mark Miller Subaru</h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-300">AI Lead Intelligence</p>
        <nav className="mt-6 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                view === item
                  ? "bg-[#2563eb] font-semibold text-white"
                  : "text-slate-200 hover:bg-[#243250]"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="mt-8 rounded-md border border-[#2f3f63] bg-[#1f2e4f] p-2 text-xs text-slate-300">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
          Powered by AI Gateway
        </div>
      </aside>

      <main className="flex-1 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#1e293b]">Lead Pipeline</h2>
            <p className="text-xs text-slate-500">Live updates every 10 seconds</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">Live</span>
            <span className="text-xs text-slate-500">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading"}
            </span>
            <button
              onClick={fetchLeads}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[#d9e2f0] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Leads</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{leads.length}</p>
          </div>
          <div className="rounded-lg border border-[#d9e2f0] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Average Score</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{avgScore}</p>
          </div>
          <div className="rounded-lg border border-[#d9e2f0] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Hot Leads</p>
            <p className="mt-1 text-2xl font-bold text-[#ef4444]">{hotCount}</p>
          </div>
          <div className="rounded-lg border border-[#d9e2f0] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Warm Leads</p>
            <p className="mt-1 text-2xl font-bold text-[#f97316]">{warmCount}</p>
          </div>
          <div className="rounded-lg border border-[#d9e2f0] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Converted</p>
            <p className="mt-1 text-2xl font-bold text-[#22c55e]">{byStatus("converted").length}</p>
          </div>
        </div>

        {view === "Pipeline" && (
          <div className="grid gap-3 xl:grid-cols-3">
            {Object.entries(columns).map(([status, title]) => (
              <section key={status} className="flex max-h-[calc(100vh-245px)] flex-col rounded-lg border border-[#d9e2f0] bg-white p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {byStatus(status).length}
                  </span>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                  {byStatus(status).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onOpen={() => setSelectedLead(lead)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {view === "All Leads" && (
          <div className="overflow-hidden rounded-lg border border-[#d9e2f0] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fbff]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Name</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Score</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Tier</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Specialist</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-[#f8fbff]"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{lead.name}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{lead.score}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{lead.tier}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{lead.assigned_specialist}</td>
                    <td className="px-3 py-2.5 text-sm capitalize text-slate-700">{lead.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "Email Log" && <EmailLog items={allEmails} />}
      </main>

      {selectedLead && (
        <LeadBrief
          lead={selectedLead}
          apiUrl={apiUrl}
          onClose={() => setSelectedLead(null)}
          onUpdated={fetchLeads}
        />
      )}
    </div>
  );
}
