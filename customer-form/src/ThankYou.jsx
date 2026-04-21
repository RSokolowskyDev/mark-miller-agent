export default function ThankYou({ result }) {
  const specialist = result?.assessment?.assignedSpecialist || "our team";
  const name = result?.customerName || "there";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900">Thanks {name}</h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-700">
        {specialist} is reviewing your information and will be in touch shortly.
      </p>
      <svg className="mx-auto mt-8 h-40 w-40 text-brand" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="4" />
        <path d="M20 60 L40 40 L55 52 L78 30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 74 H80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}