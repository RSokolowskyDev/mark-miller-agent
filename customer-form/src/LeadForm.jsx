import { useMemo, useState } from "react";

const TOTAL_STEPS = 10;
const experienceButtons = [
  "Walk me through everything",
  "Give me the facts, I'll decide",
  "No pressure, still early",
];
const usageButtons = ["Daily commute", "Family / kids", "Outdoor adventures"];
const priorityButtons = ["Safety", "Low payment", "Reliability"];
const timelineButtons = ["This week", "This month", "Just exploring"];
const followUpButtons = ["Email", "Text", "Call"];

const confidenceCopy = {
  1: "A little nervous, new to this",
  2: "I could use a lot of guidance",
  3: "Somewhere in the middle",
  4: "Pretty confident overall",
  5: "Confident, I know what I want",
};

const demoProfile = {
  name: "Sarah",
  confidence: 2,
  experienceChoice: "Walk me through everything",
  experienceText: "",
  usageChoices: ["Family / kids", "Outdoor adventures"],
  usageText: "",
  priorityChoices: ["Safety", "Reliability"],
  priorityText: "",
  budgetSlider: 35000,
  budgetText: "",
  timeline: "This month",
  tradeInYes: true,
  tradeInDetails: "2019 Honda Pilot",
  followUp: "Email",
  context:
    "I have three kids and two dogs — a lab and a golden. We ski up Little Cottonwood Canyon almost every weekend in winter. Need something with AWD, good cargo space, and that can handle Utah snow. My husband drives a truck so this would be the main family car. We also camp near Moab in the summer.",
  email: "",
};

function formatBudget(value) {
  if (value === null || value === undefined) return "";
  if (value >= 70000) return "$70,000+";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function stepIsValid(step, form) {
  switch (step) {
    case 0:
      return form.name.trim().length >= 1;
    case 1:
      return form.confidence >= 1 && form.confidence <= 5;
    case 2:
      return Boolean(form.experienceChoice || form.experienceText.trim());
    case 3:
      return form.usageChoices.length > 0 || Boolean(form.usageText.trim());
    case 4:
      return form.priorityChoices.length > 0 || Boolean(form.priorityText.trim());
    case 5:
      return Boolean(form.budgetText.trim()) || typeof form.budgetSlider === "number";
    case 6:
      return Boolean(form.timeline);
    case 7:
      return !form.tradeInYes || Boolean(form.tradeInDetails.trim());
    case 8:
      return Boolean(form.followUp);
    case 9:
      return true;
    default:
      return false;
  }
}

function PrimaryButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      type="button"
      className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-base font-semibold transition ${
        active
          ? "border-[#1a3a6b] bg-[#1a3a6b] text-white"
          : "border-[#b8cae5] bg-white text-[#1a3a6b] hover:border-[#1a3a6b]"
      }`}
    >
      {children}
    </button>
  );
}

export default function LeadForm({ onSubmitted, onBackgroundSuccess, onBackgroundError }) {
  const [form, setForm] = useState({
    name: "",
    confidence: 3,
    experienceChoice: "",
    experienceText: "",
    usageChoices: [],
    usageText: "",
    priorityChoices: [],
    priorityText: "",
    budgetSlider: 30000,
    budgetText: "",
    timeline: "",
    tradeInYes: false,
    tradeInDetails: "",
    followUp: "Email",
    context: "",
    email: "",
  });
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoLoadedLabel, setDemoLoadedLabel] = useState("");

  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || "http://localhost:8000", []);
  const canProceed = stepIsValid(step, form);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const goNext = () => {
    if (!canProceed || loading) return;
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (step === 0 || loading) return;
    setDirection(-1);
    setStep((prev) => prev - 1);
  };

  const toggleMulti = (key, value) => {
    setForm((prev) => {
      const current = prev[key];
      const has = current.includes(value);
      if (has) return { ...prev, [key]: current.filter((item) => item !== value) };
      return { ...prev, [key]: [...current, value] };
    });
  };

  const togglePriorities = (value) => {
    setForm((prev) => {
      const current = prev.priorityChoices;
      const has = current.includes(value);
      if (has) {
        return { ...prev, priorityChoices: current.filter((item) => item !== value) };
      }
      if (current.length >= 2) return prev;
      return { ...prev, priorityChoices: [...current, value] };
    });
  };

  const loadDemo = () => {
    setForm(demoProfile);
    setStep(TOTAL_STEPS - 1);
    setDirection(1);
    setDemoLoadedLabel("Family Weekend Adventurer");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (step < TOTAL_STEPS - 1) {
      goNext();
      return;
    }

    setLoading(true);
    setError("");

    const experience = form.experienceText.trim() || form.experienceChoice;
    const usage = [...form.usageChoices, ...(form.usageText.trim() ? [form.usageText.trim()] : [])];
    const priorities = [...form.priorityChoices, ...(form.priorityText.trim() ? [form.priorityText.trim()] : [])];
    const budget = form.budgetText.trim() || form.budgetSlider;
    const tradeIn = form.tradeInYes ? form.tradeInDetails.trim() || null : null;

    const payload = {
      name: form.name.trim(),
      confidence: form.confidence,
      experience,
      usage,
      priorities,
      budget,
      timeline: form.timeline,
      tradeIn,
      followUpPreference: form.followUp,
      context: form.context.trim(),
      email: form.email.trim(),
      intent: form.timeline === "Just exploring" ? "Just browsing" : "Looking to buy new",
      model: "Not sure yet",
      paymentMethod: "Finance",
      purchaseStyle: experience,
      extraNotes: [
        `Confidence: ${confidenceCopy[form.confidence]}`,
        usage.length ? `Usage: ${usage.join(", ")}` : "",
        priorities.length ? `Priorities: ${priorities.join(", ")}` : "",
        `Preferred follow-up: ${form.followUp}`,
      ]
        .filter(Boolean)
        .join(" | "),
    };

    onSubmitted?.({ customerName: payload.name });

    fetch(`${apiUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errPayload = await response.json().catch(() => ({}));
          throw new Error(errPayload.detail || "We could not submit your request right now.");
        }
        const data = await response.json();
        onBackgroundSuccess?.({ ...data, customerName: payload.name });
      })
      .catch((err) => {
        onBackgroundError?.(err.message || "We could not finish processing your request yet.");
      });
  };

  const question = (() => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">What's your name?</h2>
            <input
              className="w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#1a3a6b]"
              placeholder="First name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              autoFocus
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">How are you feeling about the process?</h2>
            <div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={form.confidence}
                onChange={(e) => updateField("confidence", Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-[#1a3a6b]"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>A little nervous, new to this</span>
                <span>Somewhere in the middle</span>
                <span className="text-right">Confident, I know what I want</span>
              </div>
            </div>
            <p className="rounded-xl bg-[#edf3ff] px-4 py-3 text-sm font-semibold text-[#1a3a6b]">{confidenceCopy[form.confidence]}</p>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">What kind of experience are you hoping for?</h2>
            <div className="grid gap-3">
              {experienceButtons.map((option) => (
                <PrimaryButton
                  key={option}
                  active={form.experienceChoice === option}
                  onClick={() => setForm((prev) => ({ ...prev, experienceChoice: option, experienceText: "" }))}
                >
                  {option}
                </PrimaryButton>
              ))}
              <input
                className="min-h-12 w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
                placeholder="e.g. I just want someone to make it quick and simple for me"
                value={form.experienceText}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    experienceText: e.target.value,
                    experienceChoice: e.target.value.trim() ? "" : prev.experienceChoice,
                  }))
                }
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">How will you use it most?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {usageButtons.map((option) => (
                <PrimaryButton key={option} active={form.usageChoices.includes(option)} onClick={() => toggleMulti("usageChoices", option)}>
                  {option}
                </PrimaryButton>
              ))}
            </div>
            <input
              className="min-h-12 w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
              placeholder="e.g. school runs and weekend ski trips"
              value={form.usageText}
              onChange={(e) => updateField("usageText", e.target.value)}
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">What matters most to you?</h2>
            <p className="text-sm text-slate-500">Select up to 2</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {priorityButtons.map((option) => (
                <PrimaryButton key={option} active={form.priorityChoices.includes(option)} onClick={() => togglePriorities(option)}>
                  {option}
                </PrimaryButton>
              ))}
            </div>
            <input
              className="min-h-12 w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
              placeholder="e.g. something easy to park and good in snow"
              value={form.priorityText}
              onChange={(e) => updateField("priorityText", e.target.value)}
            />
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">What's your budget?</h2>
            <p className="text-lg font-semibold text-[#1a3a6b]">
              {typeof form.budgetSlider === "number" ? `My budget is around ${formatBudget(form.budgetSlider)}` : "Type a budget below"}
            </p>
            <input
              type="range"
              min="15000"
              max="70000"
              step="5000"
              value={form.budgetSlider ?? 15000}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  budgetSlider: Number(e.target.value),
                  budgetText: "",
                }))
              }
              className="h-2 w-full cursor-pointer accent-[#1a3a6b]"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>$15,000</span>
              <span>$70,000+</span>
            </div>
            <input
              className="min-h-12 w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
              placeholder="or type it: 'around $30k' or 'not sure yet'"
              value={form.budgetText}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  budgetText: e.target.value,
                  budgetSlider: e.target.value.trim() ? null : prev.budgetSlider,
                }))
              }
            />
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">How soon are you deciding?</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {timelineButtons.map((option) => (
                <PrimaryButton key={option} active={form.timeline === option} onClick={() => updateField("timeline", option)}>
                  {option}
                </PrimaryButton>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">Do you have a trade-in?</h2>
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <PrimaryButton
                active={!form.tradeInYes}
                onClick={() => setForm((prev) => ({ ...prev, tradeInYes: false, tradeInDetails: "" }))}
              >
                No
              </PrimaryButton>
              <PrimaryButton active={form.tradeInYes} onClick={() => updateField("tradeInYes", true)}>
                Yes
              </PrimaryButton>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${form.tradeInYes ? "max-h-28 opacity-100" : "max-h-0 opacity-0"}`}>
              <input
                className="min-h-12 w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
                placeholder="Year, make & model — e.g. 2019 Honda Pilot"
                value={form.tradeInDetails}
                onChange={(e) => updateField("tradeInDetails", e.target.value)}
              />
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">How would you prefer we follow up?</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {followUpButtons.map((option) => (
                <PrimaryButton key={option} active={form.followUp === option} onClick={() => updateField("followUp", option)}>
                  {option}
                </PrimaryButton>
              ))}
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#1a3a6b]">
              Tell us about your life and what you need this vehicle to make possible.
            </h2>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
              placeholder="e.g. school drop-offs, 30 min commute, weekend ski trips. First time buying on my own — want something I feel confident in."
              value={form.context}
              onChange={(e) => updateField("context", e.target.value)}
            />
            <p className="text-sm text-slate-500">Even a few words help us match you to the right person.</p>
            <div className="rounded-2xl border border-[#d8dfeb] bg-white p-4">
              <label className="mb-1 block text-sm font-semibold text-[#1a3a6b]">Email for your personalized specialist introduction</label>
              <p className="mb-3 text-xs text-slate-500">Optional — we'll send one thoughtful email, no spam ever.</p>
              <input
                type="email"
                className="min-h-12 w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-base outline-none focus:border-[#1a3a6b]"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] border border-[#d8dfeb] bg-white shadow-xl">
      <header className="border-b border-[#d8dfeb] bg-white px-5 py-4 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1a3a6b] text-center text-sm font-bold leading-10 text-white">MM</div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#1a3a6b]">MARK MILLER SUBARU SOUTH TOWNE</p>
              <p className="text-lg font-semibold text-slate-900">AI Shopping Assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDemo}
            className="min-h-12 rounded-full border border-[#b8cae5] bg-white px-4 py-2 text-sm font-semibold text-[#1a3a6b] hover:border-[#1a3a6b]"
          >
            Load Demo
          </button>
        </div>
        {demoLoadedLabel && <p className="mt-2 text-xs font-semibold text-[#1a3a6b]">Loaded demo profile: {demoLoadedLabel}</p>}

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
            <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#dbe4f3]">
            <div
              className="h-2 rounded-full bg-[#1a3a6b] transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="bg-[#f7faff] px-5 py-6 md:px-7 md:py-8">
        <div key={step} className={direction >= 0 ? "question-slide-forward" : "question-slide-back"}>
          {question}
        </div>
      </div>

      <footer className="border-t border-[#d8dfeb] bg-white px-5 py-4 md:px-7">
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || loading}
            className="min-h-12 rounded-2xl border border-[#b8cae5] bg-white px-5 text-sm font-semibold text-[#1a3a6b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          <button
            type={step === TOTAL_STEPS - 1 ? "submit" : "button"}
            onClick={step === TOTAL_STEPS - 1 ? undefined : goNext}
            disabled={!canProceed || loading}
            className="min-h-12 flex-1 rounded-2xl bg-[#1a3a6b] px-5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : step === TOTAL_STEPS - 1 ? "Send to Specialist Team" : "Next"}
          </button>
        </div>
      </footer>
    </form>
  );
}
