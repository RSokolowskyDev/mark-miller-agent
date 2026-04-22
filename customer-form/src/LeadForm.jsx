import { useMemo, useState } from "react";

const intents = ["Looking to buy new", "Looking for used", "Just browsing", "Trade-in inquiry"];
const models = ["Outback", "Forester", "Crosstrek", "Ascent", "Solterra", "Impreza", "WRX", "BRZ", "Not sure yet"];
const budgets = ["Under $25k", "$25-35k", "$35-45k", "$45k+"];
const paymentMethods = ["Finance", "Lease", "Cash"];
const timelines = ["This week", "This month", "Just exploring"];
const firstTimeChoices = ["Yes, first time", "No, I have bought before", "It has been a while"];
const ownedNewChoices = ["Yes", "No", "Not sure"];
const purchaseStyles = ["I want guidance", "I like to compare details", "I want the fastest process"];

const demoProfiles = [
  {
    profileLabel: "Family Weekend Adventurer",
    name: "Sarah",
    intent: "Looking to buy new",
    model: "Outback",
    budget: "$35-45k",
    tradeIn: "2019 Honda Pilot, around 61k miles, decent shape",
    paymentMethod: "Finance",
    timeline: "This month",
    firstTimeBuyer: "No, I have bought before",
    ownedNewVehicle: "Yes",
    purchaseStyle: "I like to compare details",
    context:
      "We have 3 kids and 2 dogs, so space is a big deal for us. We do ski trips most weekends in winter and camping in summer, so AWD and cargo room matter a lot.",
    extraNotes: "Safety tech and easy car-seat setup would be huge.",
    email: "",
  },
  {
    profileLabel: "First-Time City Buyer",
    name: "Nina",
    intent: "Looking to buy new",
    model: "Crosstrek",
    budget: "$25-35k",
    tradeIn: "",
    paymentMethod: "Lease",
    timeline: "This week",
    firstTimeBuyer: "Yes, first time",
    ownedNewVehicle: "No",
    purchaseStyle: "I want guidance",
    context:
      "This is my first time buying on my own. I mostly drive in the city and want something safe, not too big, and easy to park.",
    extraNotes: "I get overwhelmed with options, so simple explanations help.",
    email: "",
  },
  {
    profileLabel: "Used + Trade-In Value Shopper",
    name: "Marcus",
    intent: "Looking for used",
    model: "Forester",
    budget: "Under $25k",
    tradeIn: "2013 Ford Escape, 132k miles, some wear",
    paymentMethod: "Cash",
    timeline: "This week",
    firstTimeBuyer: "No, I have bought before",
    ownedNewVehicle: "Not sure",
    purchaseStyle: "I want the fastest process",
    context:
      "Honestly just trying to get the best value without spending all day at the dealership. Mostly commute and kid drop-off, but I still need something solid in winter.",
    extraNotes: "Please show out-the-door numbers up front.",
    email: "",
  },
  {
    profileLabel: "Performance Enthusiast",
    name: "Evan",
    intent: "Looking to buy new",
    model: "WRX",
    budget: "$35-45k",
    tradeIn: "",
    paymentMethod: "Finance",
    timeline: "This month",
    firstTimeBuyer: "It has been a while",
    ownedNewVehicle: "Yes",
    purchaseStyle: "I like to compare details",
    context:
      "I want something fun to drive but still practical as a daily. I'd like to compare trims side by side before I commit.",
    extraNotes: "Would also like a quick breakdown of warranty and maintenance costs.",
    email: "",
  },
  {
    profileLabel: "EV-Curious Tech Professional",
    name: "Priya",
    intent: "Just browsing",
    model: "Solterra",
    budget: "$45k+",
    tradeIn: "2020 Toyota RAV4 Hybrid, 42000 miles, Very Good",
    paymentMethod: "Finance",
    timeline: "Just exploring",
    firstTimeBuyer: "No, I have bought before",
    ownedNewVehicle: "Yes",
    purchaseStyle: "I want guidance",
    context:
      "I am curious about going EV but I still have range anxiety, especially in winter. I want to understand charging and whether it actually fits my weekly routine.",
    extraNotes: "A straightforward EV vs gas comparison would help.",
    email: "",
  },
];

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

export default function LeadForm({ onSubmitted, onBackgroundSuccess, onBackgroundError }) {
  const [form, setForm] = useState({
    name: "",
    intent: "",
    model: "",
    budget: "",
    tradeIn: "",
    paymentMethod: "",
    timeline: "",
    context: "",
    firstTimeBuyer: "",
    ownedNewVehicle: "",
    purchaseStyle: "",
    extraNotes: "",
    email: "",
  });
  const [hasTradeIn, setHasTradeIn] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [tradeInInput, setTradeInInput] = useState("");
  const [contextInput, setContextInput] = useState("");
  const [extraNotesInput, setExtraNotesInput] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [tradeInSubmitted, setTradeInSubmitted] = useState(false);
  const [contextSubmitted, setContextSubmitted] = useState(false);
  const [extraNotesSubmitted, setExtraNotesSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoLoadedLabel, setDemoLoadedLabel] = useState("");
  const [lastDemoIndex, setLastDemoIndex] = useState(-1);
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || "http://localhost:8000", []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const nameDone = nameSubmitted && form.name.trim().length > 0;
  const intentDone = !!form.intent;
  const modelDone = !!form.model;
  const budgetDone = !!form.budget;
  const tradeAnswered = hasTradeIn !== null;
  const tradeDone =
    hasTradeIn === false || (hasTradeIn === true && tradeInSubmitted && form.tradeIn.trim().length > 0);
  const paymentDone = !!form.paymentMethod;
  const timelineDone = !!form.timeline;
  const contextDone = contextSubmitted && form.context.trim().length > 0;
  const firstTimeDone = !!form.firstTimeBuyer;
  const ownedNewDone = !!form.ownedNewVehicle;
  const purchaseStyleDone = !!form.purchaseStyle;
  const extraNotesDone = !extraNotesInput.trim() || extraNotesSubmitted;
  const pipelineComplete =
    nameDone &&
    intentDone &&
    modelDone &&
    budgetDone &&
    tradeAnswered &&
    tradeDone &&
    paymentDone &&
    timelineDone &&
    firstTimeDone &&
    ownedNewDone &&
    purchaseStyleDone &&
    contextDone;

  const loadDemo = () => {
    let nextIndex = Math.floor(Math.random() * demoProfiles.length);
    if (demoProfiles.length > 1 && nextIndex === lastDemoIndex) {
      nextIndex = (nextIndex + 1) % demoProfiles.length;
    }
    const demoData = demoProfiles[nextIndex];
    const hasTrade = Boolean((demoData.tradeIn || "").trim());

    setLastDemoIndex(nextIndex);
    setDemoLoadedLabel(demoData.profileLabel);
    setHasTradeIn(hasTrade);
    setForm(demoData);
    setNameInput(demoData.name);
    setTradeInInput(demoData.tradeIn || "");
    setContextInput(demoData.context);
    setExtraNotesInput(demoData.extraNotes || "");
    setNameSubmitted(true);
    setTradeInSubmitted(hasTrade);
    setContextSubmitted(true);
    setExtraNotesSubmitted(true);
  };

  const submitName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setField("name", trimmed);
    setNameSubmitted(true);
  };

  const submitTradeIn = () => {
    const trimmed = tradeInInput.trim();
    if (!trimmed) return;
    setField("tradeIn", trimmed);
    setTradeInSubmitted(true);
  };

  const submitContext = () => {
    const trimmed = contextInput.trim();
    if (!trimmed) return;
    setField("context", trimmed);
    setContextSubmitted(true);
  };

  const submitExtraNotes = () => {
    setField("extraNotes", extraNotesInput.trim());
    setExtraNotesSubmitted(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !pipelineComplete || !extraNotesDone) return;
    setLoading(true);
    setError("");

    const payload = { ...form };
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
        {demoLoadedLabel && (
          <p className="w-full text-xs font-semibold text-[#1b4e96]">
            Loaded demo profile: {demoLoadedLabel}
          </p>
        )}
      </header>

      <div className="space-y-1 px-4 py-5 md:px-6">
        <AssistantBubble>Hey there, welcome in. What should we call you?</AssistantBubble>
        {!nameDone && (
          <div className="mb-5 ml-12">
            <div className="flex gap-2">
              <input
                className="w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
                placeholder="First name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitName();
                  }
                }}
                required
              />
              <button
                type="button"
                onClick={submitName}
                className="rounded-2xl bg-[#2a6fcd] px-4 py-3 text-sm font-semibold text-white"
              >
                Send
              </button>
            </div>
          </div>
        )}
        {nameDone && <UserBubble>{form.name}</UserBubble>}

        {nameDone && (
          <>
            <AssistantBubble>What brings you in today?</AssistantBubble>
            <ChoiceChips options={intents} value={form.intent} onChange={(value) => setField("intent", value)} />
          </>
        )}
        {intentDone && <UserBubble>{form.intent}</UserBubble>}

        {intentDone && (
          <>
            <AssistantBubble>Which model caught your eye?</AssistantBubble>
            <ChoiceChips
              options={models}
              value={form.model}
              onChange={(value) => setField("model", value)}
              columns="sm:grid-cols-3"
            />
          </>
        )}
        {modelDone && <UserBubble>{form.model}</UserBubble>}

        {modelDone && (
          <>
            <AssistantBubble>What budget range feels right?</AssistantBubble>
            <ChoiceChips options={budgets} value={form.budget} onChange={(value) => setField("budget", value)} />
          </>
        )}
        {budgetDone && <UserBubble>{form.budget}</UserBubble>}

        {budgetDone && (
          <>
            <AssistantBubble>Do you have a trade-in?</AssistantBubble>
            <ChoiceChips
              options={["No", "Yes"]}
              value={hasTradeIn === null ? "" : hasTradeIn ? "Yes" : "No"}
              onChange={(value) => {
                const yes = value === "Yes";
                setHasTradeIn(yes);
                if (!yes) {
                  setField("tradeIn", "");
                  setTradeInSubmitted(false);
                  setTradeInInput("");
                }
              }}
              columns="grid-cols-2 max-w-[320px]"
            />
          </>
        )}

        {hasTradeIn && !tradeInSubmitted && (
          <div className="mb-6 ml-12 animate-fadeUp">
            <div className="flex gap-2">
              <input
                className="w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
                placeholder="e.g. 2019 Honda Pilot, 61000 miles, Good"
                value={tradeInInput}
                onChange={(e) => setTradeInInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitTradeIn();
                  }
                }}
              />
              <button
                type="button"
                onClick={submitTradeIn}
                className="rounded-2xl bg-[#2a6fcd] px-4 py-3 text-sm font-semibold text-white"
              >
                Send
              </button>
            </div>
          </div>
        )}
        {tradeAnswered && tradeDone && (
          <UserBubble>{hasTradeIn ? form.tradeIn || "Yes, I have a trade-in." : "No trade-in."}</UserBubble>
        )}

        {tradeAnswered && tradeDone && (
          <>
            <AssistantBubble>How are you planning to pay?</AssistantBubble>
            <ChoiceChips options={paymentMethods} value={form.paymentMethod} onChange={(value) => setField("paymentMethod", value)} />
          </>
        )}
        {paymentDone && <UserBubble>{form.paymentMethod}</UserBubble>}

        {paymentDone && (
          <>
            <AssistantBubble>How soon are you looking to decide?</AssistantBubble>
            <ChoiceChips options={timelines} value={form.timeline} onChange={(value) => setField("timeline", value)} />
          </>
        )}
        {timelineDone && <UserBubble>{form.timeline}</UserBubble>}

        {timelineDone && (
          <>
            <AssistantBubble>Is this your first time buying a vehicle?</AssistantBubble>
            <ChoiceChips options={firstTimeChoices} value={form.firstTimeBuyer} onChange={(value) => setField("firstTimeBuyer", value)} />
          </>
        )}
        {firstTimeDone && <UserBubble>{form.firstTimeBuyer}</UserBubble>}

        {firstTimeDone && (
          <>
            <AssistantBubble>Have you owned a new vehicle before?</AssistantBubble>
            <ChoiceChips options={ownedNewChoices} value={form.ownedNewVehicle} onChange={(value) => setField("ownedNewVehicle", value)} columns="grid-cols-3" />
          </>
        )}
        {ownedNewDone && <UserBubble>{form.ownedNewVehicle}</UserBubble>}

        {ownedNewDone && (
          <>
            <AssistantBubble>How do you like to shop?</AssistantBubble>
            <ChoiceChips options={purchaseStyles} value={form.purchaseStyle} onChange={(value) => setField("purchaseStyle", value)} />
          </>
        )}
        {purchaseStyleDone && <UserBubble>{form.purchaseStyle}</UserBubble>}

        {purchaseStyleDone && (
          <>
            <AssistantBubble>
              Tell us about your life and how you will use this vehicle. The more specific you are, the better we can match you.
            </AssistantBubble>
            {!contextDone && (
              <div className="mb-5 ml-12">
                <textarea
                  className="min-h-[130px] w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
                  placeholder="Kids, pets, commute, ski trips, camping, city driving, anything that matters."
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  required
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={submitContext}
                    className="rounded-2xl bg-[#2a6fcd] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {contextDone && <UserBubble>{form.context}</UserBubble>}

        {contextDone && (
          <>
            <AssistantBubble>Anything else we should know before matching you?</AssistantBubble>
            {!extraNotesSubmitted && (
              <div className="mb-5 ml-12">
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-[#c4d4eb] bg-white px-4 py-3 text-lg outline-none focus:border-[#2a6fcd]"
                  placeholder="Optional: deal breakers, must-have features, service expectations, etc."
                  value={extraNotesInput}
                  onChange={(e) => setExtraNotesInput(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={submitExtraNotes}
                    className="rounded-2xl border border-[#2a6fcd] bg-white px-4 py-2 text-sm font-semibold text-[#1b4e96]"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {extraNotesSubmitted && form.extraNotes && <UserBubble>{form.extraNotes}</UserBubble>}

        {contextDone && (
          <>
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
          </>
        )}
      </div>

      <footer className="border-t border-[#d8dfeb] bg-white px-5 py-4">
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <button
          disabled={loading || !pipelineComplete || !extraNotesDone}
          type="submit"
          className="w-full rounded-2xl bg-[#2a6fcd] px-4 py-3 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing your inquiry..." : pipelineComplete ? "Send to Specialist Team" : "Complete the steps above"}
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
