import { useState } from "react";

const statuses = ["new", "contacted", "appointment", "converted", "lost"];

export default function LeadBrief({ lead, onClose, apiUrl, onUpdated }) {
  const [status, setStatus] = useState(lead.status || "new");
  const [vehicle, setVehicle] = useState(lead.recommended_model || "");
  const [email, setEmail] = useState(lead.email || "");
  const [message, setMessage] = useState("");

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
      body: JSON.stringify({ email, vehicle }),
    });
    if (response.ok) {
      setMessage("Conversion confirmed. Email sequence triggered.");
      onUpdated();
    }
  };

  const sendTest = async () => {
    await fetch(`${apiUrl}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: lead.email_subject,
        htmlBody: lead.email_html,
        body: lead.email_body,
        fromName: lead.assigned_specialist,
      }),
    });
    setMessage("Test email sent.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto max-h-[95vh] max-w-5xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{lead.name}</h2>
            <p className="text-sm text-slate-500">{lead.assigned_specialist} | {lead.urgency}</p>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1">Close</button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-sm">Status:</label>
          <select value={status} onChange={(e) => saveStatus(e.target.value)} className="rounded border px-3 py-2">
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button onClick={markConverted} className="rounded bg-green-500 px-4 py-2 text-white">Mark as Converted</button>
        </div>

        <section className="mb-4 rounded border border-slate-200 p-4">
          <h3 className="mb-2 font-semibold">About This Customer</h3>
          <p>{lead.personal_details}</p>
          {lead.trade_in && <p className="mt-2 text-sm text-slate-600">Trade-in: {lead.trade_in}</p>}
        </section>

        <section className="mb-4 rounded border border-slate-200 p-4">
          <h3 className="mb-2 font-semibold">Lead Signals</h3>
          <div className="flex flex-wrap gap-2">
            {(lead.signals || []).map((signal, i) => (
              <span key={i} className={`rounded px-2 py-1 text-xs ${signal.type === "positive" ? "bg-green-100 text-green-700" : signal.type === "negative" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                {signal.text}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded border border-slate-200 p-4">
          <h3 className="mb-2 font-semibold">Product Specialist Brief</h3>
          <p className="text-sm"><strong>Recommended model:</strong> {lead.recommended_model}</p>
          <p className="text-sm"><strong>Routing reason:</strong> {lead.routing_reason}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {(lead.talking_points || []).map((point, i) => <li key={i}>{point}</li>)}
          </ol>
        </section>

        <section className="mb-4 rounded border border-slate-200 p-4">
          <h3 className="mb-2 font-semibold">Generated Follow-up Email</h3>
          <p className="text-sm font-semibold">{lead.email_subject}</p>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{lead.email_body}</pre>
          <div className="mt-2 flex gap-2">
            <button onClick={() => navigator.clipboard.writeText(lead.email_body || "")} className="rounded border px-3 py-2 text-sm">Copy Email</button>
            <button onClick={sendTest} className="rounded border px-3 py-2 text-sm">Send Test</button>
          </div>
        </section>

        <section className="rounded border border-slate-200 p-4">
          <h3 className="mb-2 font-semibold">Email Sequence Log</h3>
          {(lead.emails_sent || []).length === 0 && <p className="text-sm text-slate-500">Convert this lead to trigger the post-sale email sequence.</p>}
          <div className="space-y-2">
            {(lead.emails_sent || []).map((entry, i) => (
              <div key={i} className="rounded bg-slate-50 p-2 text-sm">
                Email #{entry.emailNumber} | {entry.subject} | {entry.status}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded border border-slate-200 p-4">
          <h3 className="mb-2 font-semibold">Convert Lead</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded border px-3 py-2" placeholder="Vehicle purchased" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            <input className="rounded border px-3 py-2" placeholder="Customer email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </section>

        {message && <p className="mt-3 rounded bg-green-50 p-2 text-green-700">{message}</p>}
      </div>
    </div>
  );
}