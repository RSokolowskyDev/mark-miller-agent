export default function ThankYou({ result }) {
  const name = result?.customerName || "there";
  const pending = Boolean(result?.pending);

  return (
    <div className="rounded-[28px] border border-[#d8dfeb] bg-white p-10 text-center shadow-xl">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#2a6fcd] text-center text-sm font-bold leading-[48px] text-white">MM</div>
      <h1 className="text-3xl font-bold text-slate-900">Thanks {name}</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-700">
        {pending
          ? "Your request was received. We are matching you with the best specialist now."
          : "We are reviewing your information and will be in touch shortly."}
      </p>
      {pending && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">You can close this page any time.</p>}
      <svg className="mx-auto mt-8 h-40 w-40 text-[#2a6fcd]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="4" />
        <path d="M20 60 L40 40 L55 52 L78 30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 74 H80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
