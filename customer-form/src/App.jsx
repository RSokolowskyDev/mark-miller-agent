import { useState } from "react";
import LeadForm from "./LeadForm";
import ThankYou from "./ThankYou";

export default function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {!result ? <LeadForm onSuccess={setResult} /> : <ThankYou result={result} />}
      </div>
    </div>
  );
}