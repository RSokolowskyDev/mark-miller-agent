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
    new: "New Leads",
    contacted: "Contacted",
    appointment: "Appointment Set",
    converted: "Converted",
  };

  const byStatus = (status) => leads.filter((lead) => (lead.status || "new") === status);

  const allEmails = leads.flatMap((lead) =>
    (lead.emails_sent || []).map((item) => ({
      leadName: lead.name,
      ...item,
    }))
  );

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-[#1a2744] p-4 text-white">
        <h1 className="text-lg font-bold">Mark Miller Subaru</h1>
        <p className="text-sm text-slate-300">AI Lead Intelligence</p>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <button key={item} onClick={() => setView(item)} className={`w-full rounded px-3 py-2 text-left ${view === item ? "bg-[#2563eb]" : "hover:bg-slate-700"}`}>
              {item}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-8 text-xs text-slate-300">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
          Powered by AI Gateway
        </div>
      </aside>

      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Lead Pipeline</h2>
            <p className="text-sm text-slate-500">Live updates every 10 seconds</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Live</span>
            <span className="text-sm text-slate-500">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading"}</span>
            <button onClick={fetchLeads} className="rounded border border-slate-300 px-3 py-2 text-sm">Refresh</button>
          </div>
        </div>

        {view === "Pipeline" && (
          <div className="grid gap-4 xl:grid-cols-4">
            {Object.entries(columns).map(([status, title]) => (
              <section key={status} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{byStatus(status).length}</span>
                </div>
                <div className="space-y-3">
                  {byStatus(status).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onOpen={() => setSelectedLead(lead)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {view === "All Leads" && (
          <div className="rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Specialist</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setSelectedLead(lead)}>
                    <td className="p-3">{lead.name}</td>
                    <td className="p-3">{lead.score}</td>
                    <td className="p-3">{lead.tier}</td>
                    <td className="p-3">{lead.assigned_specialist}</td>
                    <td className="p-3">{lead.status}</td>
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