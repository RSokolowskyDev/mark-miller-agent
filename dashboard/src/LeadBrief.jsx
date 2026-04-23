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

function parseNextBestStep(raw, fallbackSummary) {
  const base = {
    action:
      "Send two matched options by email and ask for one must-have to narrow the recommendation.",
    discoveryQuestions: [
      {
        question: "Who else is involved in the final decision?",
        rationale: "Knowing decision dynamics helps set realistic pace and follow-up strategy.",
      },
      {
        question: "What frustrates you most about your current vehicle right now?",
        rationale: "Current pain points reveal non-negotiables that should drive model and trim fit.",
      },
      {
        question: "Is your budget a hard cap or flexible for the right long-term fit?",
        rationale: "Budget language is often directional, and flexibility changes recommendation range.",
      },
      {
        question: "Have you visited or compared other dealerships yet?",
        rationale: "Competitive context helps the specialist address missing concerns early.",
      },
    ],
    _fallbackRationale:
      fallbackSummary ||
      "Use this as a starting recommendation and refine with high-impact discovery.",
  };

  const normalizedRaw = raw && typeof raw === "object" ? raw : {};
  const action = String(normalizedRaw.action || "").trim();
  const questions = Array.isArray(normalizedRaw.discoveryQuestions)
    ? normalizedRaw.discoveryQuestions
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          question: String(item.question || "").trim(),
          rationale: String(item.rationale || "").trim(),
        }))
        .filter((item) => item.question)
        .slice(0, 5)
    : [];

  return {
    action: action || base.action,
    discoveryQuestions: questions.length ? questions : base.discoveryQuestions,
    fallbackRationale: base._fallbackRationale,
  };
}

function buildDigitalFootprint(lead, details, signals) {
  const items = [];
  const lowerDetails = String(details || "").toLowerCase();
  const inferredInterests = [
    lowerDetails.includes("ski") ? "winter driving" : "",
    lowerDetails.includes("camp") ? "outdoor cargo use" : "",
    lowerDetails.includes("family") || lowerDetails.includes("kids") ? "family transport" : "",
    lowerDetails.includes("awd") || lowerDetails.includes("snow") ? "all-weather confidence" : "",
  ].filter(Boolean);

  if (lead.recommended_model) {
    items.push({
      source: "SUBARU.COM",
      detail: `Viewed model details and trims around ${lead.recommended_model}.`,
    });
  }
  if (lead.trade_in) {
    items.push({
      source: "KBB",
      detail: `Trade-in valuation activity detected for ${lead.trade_in}.`,
    });
  }
  if (inferredInterests.length) {
    items.push({
      source: "CRM PROFILE",
      detail: `Behavioral intent inferred: ${inferredInterests.join(", ")}.`,
    });
  }
  if (signals.length) {
    items.push({
      source: "AI SIGNALS",
      detail: signals
        .slice(0, 2)
        .map((signal) => signal.text)
        .join(" | "),
    });
  }
  items.push({
    source: "PIPELINE",
    detail: `Current lead state: ${lead.tier || "unrated"} (score ${lead.score ?? "N/A"}).`,
  });

  return items.slice(0, 5);
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
  const personalDetails = parsePersonalDetails(lead.personal_details);
  const compactContext = personalDetails ? personalDetails.split(". ").slice(0, 1).join(". ") : "No context captured.";
  const nextBestStep = parseNextBestStep(
    lead.nextBestStep || lead.best_next_step,
    lead.routing_reason || lead.summary
  );
  const digitalFootprint = useMemo(
    () => buildDigitalFootprint(lead, personalDetails, normalizedSignals),
    [lead, personalDetails, normalizedSignals]
  );
  const unifiedInsightSignals = useMemo(() => {
    const signalItems = normalizedSignals.map((signal) => ({
      key: `signal-${signal.text}`,
      label: signal.text,
      tone: signal.type === "negative" ? "red" : "green",
    }));
    const footprintItems = digitalFootprint.map((item, index) => ({
      key: `footprint-${index}`,
      label: `${item.source}: ${item.detail}`,
      tone: "slate",
    }));
    return [...signalItems, ...footprintItems].slice(0, 12);
  }, [normalizedSignals, digitalFootprint]);

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
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{lead.name}</h2>
            <p className="text-sm text-slate-500">
              Product Specialist: {lead.assigned_specialist || "Unassigned"} | {lead.tier} | Score {lead.score}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold">Close</button>
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-2">
          <section className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-2 text-sm font-semibold">Customer Profile</h3>
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

            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Digital Footprint</h4>
              <ul className="space-y-2">
                {digitalFootprint.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">{item.source}</span>
                    <span className="text-slate-700">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-2 text-sm font-semibold">Product Specialist Workflow</h3>
            <div className="mb-3 rounded-md bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Recommended Action</p>
              <p className="mt-1 text-sm text-amber-950">{nextBestStep.action}</p>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Insight & Next Best Step</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unifiedInsightSignals.length === 0 && <span className="text-xs text-slate-500">No signals captured.</span>}
                {unifiedInsightSignals.map((item) => (
                  <span
                    key={item.key}
                    className={`rounded px-2 py-1 text-xs ${
                      item.tone === "red"
                        ? "bg-red-100 text-red-800"
                        : item.tone === "slate"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
              <ol className="mt-2 space-y-2">
                {nextBestStep.discoveryQuestions.map((item, index) => (
                  <li key={index} className="rounded border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-900">{index + 1}. {item.question}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{item.rationale || nextBestStep.fallbackRationale}</p>
                  </li>
                ))}
              </ol>
            </div>
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

        <section className="mb-3 rounded-md border border-slate-200 p-3">
          <h3 className="mb-1 text-sm font-semibold">Why This Product Specialist</h3>
          <p className="text-xs text-slate-700">{profile.whyMatch || lead.routing_reason || "Matched based on fit to lead goals and communication style."}</p>
        </section>

        <section className="rounded-md border border-slate-200 p-3">
          <h3 className="mb-2 text-sm font-semibold">Follow-Up Email</h3>
          <p className="text-sm font-semibold text-slate-700">{lead.email_subject}</p>
          <pre className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{lead.email_body}</pre>
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
