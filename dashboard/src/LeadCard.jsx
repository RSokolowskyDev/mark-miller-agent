const tierColors = {
  Hot: "bg-red-500",
  Warm: "bg-orange-500",
  Cold: "bg-blue-500",
};

export default function LeadCard({ lead, onOpen }) {
  return (
    <button onClick={onOpen} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-blue-300">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{lead.name}</p>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs text-white ${tierColors[lead.tier] || "bg-slate-500"}`}>
          {lead.score}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-1">{(lead.tier || "COLD").toUpperCase()}</span>
        <span className="rounded bg-slate-100 px-2 py-1">{lead.recommended_model}</span>
        <span className="rounded bg-slate-100 px-2 py-1">{lead.urgency}</span>
      </div>
      <p className="mt-2 truncate text-sm text-slate-600">{lead.summary}</p>
      <p className="mt-1 text-xs text-slate-500">{lead.assigned_specialist}</p>
    </button>
  );
}