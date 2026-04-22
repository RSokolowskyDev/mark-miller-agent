import { useEffect, useMemo, useState } from "react";
import LeadCard from "./LeadCard";
import LeadBrief from "./LeadBrief";
import EmailLog from "./EmailLog";

const navItems = ["Pipeline", "All Leads", "Email Log"];
const baseRepProfiles = [
  {
    name: "Ryan Sokolowsky",
    title: "Senior Product Specialist",
    experience: "9 years in automotive sales and customer consulting",
    interests: ["Family-fit vehicle matching", "Transparent financing", "Safety-first recommendations"],
    focus: "Best for family buyers and customers comparing practical trim options",
  },
  {
    name: "Alex Rivera",
    title: "Customer Fit Specialist",
    experience: "7 years helping first-time and returning buyers",
    interests: ["First-time buyer coaching", "Lifestyle discovery", "Trade-in strategy"],
    focus: "Best for customers who want guidance and confidence through every step",
  },
  {
    name: "Jordan Mack",
    title: "Vehicle Match Advisor",
    experience: "6 years in model education and test-drive planning",
    interests: ["Feature deep-dives", "Trim comparisons", "Ownership value planning"],
    focus: "Best for detail-oriented customers who compare specs and features closely",
  },
  {
    name: "Taylor Chen",
    title: "Ownership Experience Specialist",
    experience: "8 years in long-term ownership and retention",
    interests: ["Service planning", "Warranty education", "Family comfort setup"],
    focus: "Best for buyers focused on long-term reliability and ownership costs",
  },
  {
    name: "Casey Patel",
    title: "EV & Technology Specialist",
    experience: "5 years focused on EV onboarding and connected tech",
    interests: ["EV readiness", "Charging guidance", "Driver-assist technology"],
    focus: "Best for EV-curious customers and tech-forward shoppers",
  },
];

export default function App() {
  const [view, setView] = useState("Pipeline");
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedReps, setExpandedReps] = useState({});
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
  const repProfiles = useMemo(() => {
    const map = new Map(baseRepProfiles.map((rep) => [rep.name.toLowerCase(), { ...rep, assignedLeads: 0 }]));

    leads.forEach((lead) => {
      const profile = lead.specialist_profile || {};
      const repName = String(profile.name || lead.assigned_specialist || "").trim();
      if (!repName) return;

      const key = repName.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.assignedLeads += 1;
        existing.leads = [...(existing.leads || []), lead];
        return;
      }

      map.set(key, {
        name: repName,
        title: String(profile.title || "Customer Fit Specialist"),
        experience: "Experience available via recent routing performance",
        interests: (profile.strengths || []).slice(0, 3),
        focus: String(profile.whyMatch || "Matched to customer lifestyle and buying goals."),
        assignedLeads: 1,
        leads: [lead],
      });
    });

    return Array.from(map.values())
      .map((rep) => ({
        ...rep,
        leads: (rep.leads || []).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)),
      }))
      .sort((a, b) => b.assignedLeads - a.assignedLeads || a.name.localeCompare(b.name));
  }, [leads]);

  const toggleRep = (name) => {
    setExpandedReps((prev) => ({ ...prev, [name]: !prev[name] }));
  };

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
        <div className="mt-6 border-t border-[#2f3f63] pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">Sales Rep Profiles</p>
          <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
            {repProfiles.map((rep) => {
              const isOpen = Boolean(expandedReps[rep.name]);
              return (
                <div key={rep.name} className="rounded-md border border-[#2f3f63] bg-[#1f2e4f]">
                  <button
                    onClick={() => toggleRep(rep.name)}
                    className="w-full px-2.5 py-2 text-left hover:bg-[#243250]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{rep.name}</p>
                        <p className="text-[11px] text-slate-300">{rep.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-slate-200">{rep.assignedLeads}</p>
                        <p className="text-[10px] text-slate-400">{isOpen ? "Hide" : "Show"}</p>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#31456f] bg-[#192846] p-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Experience</p>
                      <p className="mb-2 text-[11px] text-slate-200">{rep.experience}</p>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Assigned Leads</p>
                      <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                        {(rep.leads || []).length === 0 && (
                          <p className="text-[11px] text-slate-400">No leads assigned yet.</p>
                        )}
                        {(rep.leads || []).map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className="w-full rounded border border-[#3b4f79] bg-[#22345a] px-2 py-1.5 text-left hover:border-[#6d89c7]"
                          >
                            <p className="text-xs font-semibold text-white">{lead.name}</p>
                            <p className="line-clamp-2 text-[10px] text-slate-200">
                              {lead.routing_reason || lead.summary || "Matched based on profile fit and goals."}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
