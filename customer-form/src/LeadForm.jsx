import { useMemo, useState } from "react";

const intents = ["Looking to buy new", "Looking for used", "Just browsing", "Trade-in inquiry"];
const models = ["Outback", "Forester", "Crosstrek", "Ascent", "Solterra", "Impreza", "WRX", "BRZ", "Not sure yet"];
const budgets = ["Under $25k", "$25-35k", "$35-45k", "$45k+"];
const paymentMethods = ["Finance", "Lease", "Cash"];
const timelines = ["This week", "This month", "Just exploring"];

const demoData = {
  name: "Sarah",
  intent: "Looking to buy new",
  model: "Outback",
  budget: "$35-45k",
  tradeIn: "2019 Honda Pilot, 2019, 61000 miles, Good",
  paymentMethod: "Finance",
  timeline: "This month",
  context:
    "I have three kids and two dogs - a lab and a golden. We ski up Little Cottonwood Canyon almost every weekend in winter. Need something with AWD, good cargo space, and that can handle Utah snow. My husband drives a truck so this would be the main family car. We also do a lot of camping in the summer out near Moab.",
  email: "",
};

function OptionButtons({ options, value, onChange }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-xl border px-4 py-2 text-left transition ${
            value === option ? "border-brand bg-brand text-white" : "border-slate-300 bg-white hover:border-brand"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function LeadForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    intent: "",
    model: "",
    budget: "",
    tradeIn: "",
    paymentMethod: "",
    timeline: "",
    context: "",
    email: "",
  });
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || "http://localhost:8000", []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadDemo = () => {
    setHasTradeIn(true);
    setForm(demoData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("We could not submit your request right now.");

      const data = await response.json();
      onSuccess({ ...data, customerName: form.name });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fadeUp rounded-2xl border border-slate-200 bg-white p-6 shadow-lg md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand">Mark Miller Subaru South Towne</p>
          <h1 className="text-2xl font-bold text-slate-900">Find the right Subaru for your life</h1>
        </div>
        <button type="button" onClick={loadDemo} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-brand">
          Load Demo
        </button>
      </div>

      <div className="space-y-6">
        <label className="block">
          <span className="mb-2 block font-medium">What's your name?</span>
          <input className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="First name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        </label>

        <section>
          <p className="mb-2 font-medium">What brings you in today?</p>
          <OptionButtons options={intents} value={form.intent} onChange={(value) => setField("intent", value)} />
        </section>

        <section>
          <p className="mb-2 font-medium">Which model caught your eye?</p>
          <OptionButtons options={models} value={form.model} onChange={(value) => setField("model", value)} />
        </section>

        <section>
          <p className="mb-2 font-medium">What's your budget?</p>
          <OptionButtons options={budgets} value={form.budget} onChange={(value) => setField("budget", value)} />
        </section>

        <section>
          <p className="mb-2 font-medium">Do you have a trade-in?</p>
          <div className="flex gap-2">
            <button type="button" className={`rounded-lg border px-4 py-2 ${hasTradeIn ? "border-slate-300" : "border-brand bg-brand text-white"}`} onClick={() => { setHasTradeIn(false); setField("tradeIn", ""); }}>No</button>
            <button type="button" className={`rounded-lg border px-4 py-2 ${hasTradeIn ? "border-brand bg-brand text-white" : "border-slate-300"}`} onClick={() => setHasTradeIn(true)}>Yes</button>
          </div>
          {hasTradeIn && (
            <input className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="e.g. 2019 Honda Pilot, 61000 miles, Good" value={form.tradeIn} onChange={(e) => setField("tradeIn", e.target.value)} />
          )}
        </section>

        <section>
          <p className="mb-2 font-medium">How are you planning to pay?</p>
          <OptionButtons options={paymentMethods} value={form.paymentMethod} onChange={(value) => setField("paymentMethod", value)} />
        </section>

        <section>
          <p className="mb-2 font-medium">How soon are you looking to decide?</p>
          <OptionButtons options={timelines} value={form.timeline} onChange={(value) => setField("timeline", value)} />
        </section>

        <label className="block">
          <span className="mb-2 block font-medium">Tell us about yourself and how you'll use this vehicle</span>
          <textarea className="min-h-[100px] w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Share your routine, family, hobbies, and what matters most." value={form.context} onChange={(e) => setField("context", e.target.value)} required />
          <span className="mt-2 block text-sm text-slate-600">The more you share, the better we can match you to the right vehicle and specialist.</span>
        </label>

        <label className="block">
          <span className="mb-2 block font-medium">Email address (optional)</span>
          <input type="email" className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="For your personalized follow-up" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          <span className="mt-2 block text-sm text-slate-600">We'll send one thoughtful email - no spam, ever.</span>
        </label>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <button disabled={loading} type="submit" className="mt-6 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-70">
        {loading ? "Analyzing your inquiry..." : "Submit"}
      </button>
      {loading && <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-200"><div className="h-2 w-1/3 animate-pulse rounded bg-brand" /></div>}
    </form>
  );
}