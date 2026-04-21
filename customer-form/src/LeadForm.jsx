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

function AssistantBubble({ children }) {
  return (
    <div className="mb-2 flex items-start gap-3 animate-fadeUp">
      <div className="mt-1 h-9 w-9 rounded-full border border-slate-200 bg-white text-center text-xs font-bold leading-9 text-[#2a6fcd]">MM</div>
      <div className="max-w-[760px] rounded-2xl border border-[#d6deea] bg-white px-5 py-4 text-lg text-slate-800 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }) {
  if (!children) return null;
  return (
    <div className="mb-5 flex justify-end animate-fadeUp">
      <div className="max-w-[600px] rounded-2xl bg-[#2a6fcd] px-5 py-3 text-lg text-white shadow-sm">
        {children}
      </div>
    </div>
  );
}

function ChoiceChips({ options, value, onChange, columns = "sm:grid-cols-2" }) {
  return (
    <div className={`mb-6 ml-12 grid gap-3 ${columns}`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full border px-5 py-2.5 text-left text-lg transition ${
            value === option
              ? "border-[#2a6fcd] bg-[#2a6fcd] text-white"
              : "border-[#b8cae5] bg-white text-[#1b4e96] hover:border-[#2a6fcd]"
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
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] border border-[#d8dfeb] bg-[#f3f6fb] shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8dfeb] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#2a6fcd] text-center text-sm font-bold leading-10 text-white">MM</div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#1b4e96]">MARK MILLER SUBARU SOUTH TOWNE</p>
            <p className="text-lg font-semibold text-slate-900">AI Shopping Assistant</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadDemo}
          className="rounded-full border border-[#b8cae5] bg-white px-4 py-2 text-sm font-semibold text-[#1b4e96] hover:border-[#2a6fcd]"
        >
          Load Demo
        </button>
      </header>

      <div className="space-y-1 px-4 py-5 md:px-6">
        <AssistantBubble>Hey there, welcome in. What should we call you?</AssistantBubble>
        <div className="mb-5 ml-12">
          <input
            className="w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
            placeholder="First name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
        </div>
        <UserBubble>{form.name}</UserBubble>

        <AssistantBubble>What brings you in today?</AssistantBubble>
        <ChoiceChips options={intents} value={form.intent} onChange={(value) => setField("intent", value)} />
        <UserBubble>{form.intent}</UserBubble>

        <AssistantBubble>Which model caught your eye?</AssistantBubble>
        <ChoiceChips
          options={models}
          value={form.model}
          onChange={(value) => setField("model", value)}
          columns="sm:grid-cols-3"
        />
        <UserBubble>{form.model}</UserBubble>

        <AssistantBubble>What budget range feels right?</AssistantBubble>
        <ChoiceChips options={budgets} value={form.budget} onChange={(value) => setField("budget", value)} />
        <UserBubble>{form.budget}</UserBubble>

        <AssistantBubble>Do you have a trade-in?</AssistantBubble>
        <ChoiceChips
          options={["No", "Yes"]}
          value={hasTradeIn ? "Yes" : "No"}
          onChange={(value) => {
            const yes = value === "Yes";
            setHasTradeIn(yes);
            if (!yes) setField("tradeIn", "");
          }}
          columns="grid-cols-2 max-w-[320px]"
        />
        {hasTradeIn && (
          <div className="mb-6 ml-12 animate-fadeUp">
            <input
              className="w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
              placeholder="e.g. 2019 Honda Pilot, 61000 miles, Good"
              value={form.tradeIn}
              onChange={(e) => setField("tradeIn", e.target.value)}
            />
          </div>
        )}
        <UserBubble>{hasTradeIn ? form.tradeIn || "Yes, I have a trade-in." : "No trade-in."}</UserBubble>

        <AssistantBubble>How are you planning to pay?</AssistantBubble>
        <ChoiceChips options={paymentMethods} value={form.paymentMethod} onChange={(value) => setField("paymentMethod", value)} />
        <UserBubble>{form.paymentMethod}</UserBubble>

        <AssistantBubble>How soon are you looking to decide?</AssistantBubble>
        <ChoiceChips options={timelines} value={form.timeline} onChange={(value) => setField("timeline", value)} />
        <UserBubble>{form.timeline}</UserBubble>

        <AssistantBubble>
          Tell us about your life and how you will use this vehicle. The more specific you are, the better we can match you.
        </AssistantBubble>
        <div className="mb-5 ml-12">
          <textarea
            className="min-h-[130px] w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
            placeholder="Kids, pets, commute, ski trips, camping, city driving, anything that matters."
            value={form.context}
            onChange={(e) => setField("context", e.target.value)}
            required
          />
        </div>
        <UserBubble>{form.context}</UserBubble>

        <AssistantBubble>Want a personalized follow-up email? (Optional)</AssistantBubble>
        <div className="mb-3 ml-12">
          <input
            type="email"
            className="w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
          <p className="mt-2 text-sm text-slate-500">We send one thoughtful message, no spam.</p>
        </div>
      </div>

      <footer className="border-t border-[#d8dfeb] bg-white px-5 py-4">
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-2xl bg-[#2a6fcd] px-4 py-3 text-lg font-semibold text-white disabled:opacity-70"
        >
          {loading ? "Analyzing your inquiry..." : "Send to Specialist Team"}
        </button>
        {loading && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-[#d3deef]">
            <div className="h-2 w-1/3 animate-pulse rounded bg-[#2a6fcd]" />
          </div>
        )}
      </footer>
    </form>
  );
}
