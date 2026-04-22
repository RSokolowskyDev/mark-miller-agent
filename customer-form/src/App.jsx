import { useState } from "react";
import LeadForm from "./LeadForm";
import ThankYou from "./ThankYou";

export default function App() {
  const [result, setResult] = useState(null);
  const handleSubmitted = ({ customerName }) => {
    setResult({
      customerName,
      pending: true,
      assessment: { assignedSpecialist: "our specialist team" },
      error: "",
    });
  };

  const handleBackgroundSuccess = (payload) => {
    setResult((prev) => ({
      ...(prev || {}),
      ...payload,
      customerName: payload?.customerName || prev?.customerName || "there",
      pending: false,
      error: "",
    }));
  };

  const handleBackgroundError = (message) => {
    setResult((prev) => ({
      ...(prev || {}),
      pending: false,
      error: message || "We received your request, but processing is delayed. Please try again shortly.",
    }));
  };

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        {!result ? (
          <LeadForm
            onSubmitted={handleSubmitted}
            onBackgroundSuccess={handleBackgroundSuccess}
            onBackgroundError={handleBackgroundError}
          />
        ) : (
          <ThankYou result={result} />
        )}
      </div>
    </div>
  );
}
