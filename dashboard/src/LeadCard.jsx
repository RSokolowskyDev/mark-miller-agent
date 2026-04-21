const tierColors = {
  Hot: "bg-[#ef4444]",
  Warm: "bg-[#f97316]",
  Cold: "bg-[#3b82f6]",
};

function relativeTime(isoDate) {
  if (!isoDate) return "just now";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LeadCard({ lead, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-[#2563eb] hover:shadow"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ${tierColors[lead.tier] || "bg-slate-500"}`}>
          {lead.score}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{(lead.tier || "COLD").toUpperCase()}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{lead.recommended_model}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{lead.urgency}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">{lead.summary}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{lead.assigned_specialist}</p>
        <p className="text-[11px] text-slate-400">{relativeTime(lead.created_at)}</p>
      </div>
    </button>
  );
}
