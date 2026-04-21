import { useState } from "react";
import LeadForm from "./LeadForm";
import ThankYou from "./ThankYou";

export default function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        {!result ? <LeadForm onSuccess={setResult} /> : <ThankYou result={result} />}
      </div>
    </div>
  );
}
