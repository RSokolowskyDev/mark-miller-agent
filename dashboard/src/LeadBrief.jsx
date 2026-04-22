import { useMemo, useState } from "react";

const statuses = ["new", "contacted", "appointment", "converted", "lost"];

function parsePersonalDetails(raw) {
  if (!raw) return "";
  if (typeof raw !== "string") return String(raw);
  const trimmed = raw.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.join(". ");
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => String(value))
        .join(". ");
    }
  } catch {
    return raw;
  }
  return raw;
}

export default function LeadBrief({ lead, onClose, apiUrl, onUpdated }) {
  const [status, setStatus] = useState(lead.status || "new");
  const [vehicle, setVehicle] = useState(lead.recommended_model || "");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [sendingTest, setSendingTest] = useState(false);
  const [showFullContext, setShowFullContext] = useState(false);

  const normalizedSignals = useMemo(
    () =>
      (lead.signals || [])
        .map((signal) => {
          if (typeof signal === "string") return { text: signal, type: "neutral" };
          return {
            text: signal?.text || signal?.label || signal?.title || "",
            type: ["positive", "negative", "neutral"].includes(signal?.type) ? signal.type : "neutral",
          };
        })
        .filter((signal) => signal.text)
        .slice(0, 8),
    [lead.signals]
  );
  const profile = lead.specialist_profile || {};
  const profileStrengths = Array.isArray(profile.strengths) ? profile.strengths : [];
  const profileIdeal = Array.isArray(profile.idealCustomers) ? profile.idealCustomers : [];

  const personalDetails = parsePersonalDetails(lead.personal_details);
  const compactContext = personalDetails ? personalDetails.split(". ").slice(0, 2).join(". ") : "No context captured.";

  const saveStatus = async (nextStatus) => {
    setStatus(nextStatus);
    await fetch(`${apiUrl}/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    onUpdated();
  };

  const markConverted = async () => {
    const response = await fetch(`${apiUrl}/leads/${lead.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle }),
    });
    if (response.ok) {
      setMessageType("success");
      setMessage("Conversion confirmed. Email sequence triggered.");
      onUpdated();
    } else {
      const data = await response.json().catch(() => ({}));
      setMessageType("error");
      setMessage(data.detail || "Could not trigger conversion sequence.");
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const response = await fetch(`${apiUrl}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.email || "",
          subject: lead.email_subject,
          htmlBody: lead.email_html,
          body: lead.email_body,
          fromName: lead.assigned_specialist,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessageType("error");
        setMessage(data.detail || "Send Test failed.");
        return;
      }

      setMessageType("success");
      setMessage(data.message || "Test email sent.");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Send Test failed.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-3">
      <div className="mx-auto max-h-[96vh] max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{lead.name}</h2>
            <p className="text-sm text-slate-500">{lead.assigned_specialist} | {lead.tier} | Score {lead.score}</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold">Close</button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <section className="rounded-md border border-slate-200 p-3 md:col-span-2">
            <h3 className="mb-2 text-sm font-semibold">Customer Snapshot</h3>
            <p className="text-sm leading-6 text-slate-700">{compactContext}</p>
            {lead.trade_in && <p className="mt-2 text-xs text-slate-500">Trade-in: {lead.trade_in}</p>}
            <button
              onClick={() => setShowFullContext((value) => !value)}
              className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
            >
              {showFullContext ? "Hide full context" : "Show full context"}
            </button>
            {showFullContext && (
              <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-700">{personalDetails}</pre>
            )}
          </section>

          <section className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-2 text-sm font-semibold">Next Action</h3>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <select value={status} onChange={(e) => saveStatus(e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-xs">
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input
              className="mt-2 w-full rounded border px-2 py-2 text-xs"
              placeholder="Vehicle purchased"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
            <button onClick={markConverted} className="mt-2 w-full rounded-md bg-green-500 px-3 py-2 text-xs font-semibold text-white">
              Mark as Converted
            </button>
          </section>
        </div>

        <section className="mb-4 rounded-md border border-slate-200 p-3">
          <h3 className="mb-1 text-sm font-semibold">Matched Specialist Profile</h3>
          <p className="text-sm font-semibold text-slate-800">
            {profile.name || lead.assigned_specialist || "Assigned Specialist"}
            {profile.title ? ` | ${profile.title}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-600">{profile.style || "Consultative style"}</p>
          <p className="mt-2 text-xs text-slate-700">{profile.whyMatch || lead.routing_reason}</p>
          {profileStrengths.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Strengths</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {profileStrengths.map((item, idx) => (
                  <span key={idx} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">{item}</span>
                ))}
              </div>
            </div>
          )}
          {profileIdeal.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ideal Customer Fits</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-slate-700">
                {profileIdeal.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}
        </section>

        <section className="mb-4 rounded-md border border-slate-200 p-3">
          <h3 className="mb-2 text-sm font-semibold">Lead Signals</h3>
          <div className="flex flex-wrap gap-2">
            {normalizedSignals.map((signal, index) => (
              <span key={index} className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">{signal.text}</span>
            ))}
            {normalizedSignals.length === 0 && <span className="text-xs text-slate-500">No signals captured.</span>}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 p-3">
          <h3 className="mb-2 text-sm font-semibold">Follow-Up Email</h3>
          <p className="text-sm font-semibold text-slate-700">{lead.email_subject}</p>
          <pre className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{lead.email_body}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="min-w-[260px] flex-1 rounded border bg-slate-50 px-3 py-2 text-xs text-slate-600" value={lead.email || "No email captured on this lead"} readOnly />
            <button onClick={() => navigator.clipboard.writeText(lead.email_body || "")} className="rounded border px-3 py-2 text-xs">Copy</button>
            <button disabled={sendingTest} onClick={sendTest} className="rounded border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60">
              {sendingTest ? "Sending..." : "Send Test"}
            </button>
          </div>
        </section>

        {message && (
          <p
            className={`mt-3 rounded p-2 text-xs ${
              messageType === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
