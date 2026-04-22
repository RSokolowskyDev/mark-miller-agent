import os
from dotenv import load_dotenv
from crewai import Agent, LLM

load_dotenv()


def _resolve_llm() -> tuple[LLM, str, str]:
    provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    if not provider:
        if gemini_key:
            provider = "gemini"
        elif groq_key:
            provider = "groq"
        else:
            raise RuntimeError(
                "Missing API key. Set GEMINI_API_KEY (recommended) or GROQ_API_KEY in backend/.env."
            )

    if provider == "gemini":
        if not gemini_key:
            raise RuntimeError("LLM_PROVIDER=gemini but GEMINI_API_KEY is missing in backend/.env.")
        model = os.getenv("LLM_MODEL", "gemini/gemini-2.5-flash-lite")
        return LLM(model=model, api_key=gemini_key), provider, model

    if provider == "groq":
        if not groq_key:
            raise RuntimeError("LLM_PROVIDER=groq but GROQ_API_KEY is missing in backend/.env.")
        model = os.getenv("LLM_MODEL", "groq/llama-3.1-8b-instant")
        return LLM(model=model, api_key=groq_key), provider, model

    raise RuntimeError("Unsupported LLM_PROVIDER. Use 'gemini' or 'groq'.")


llm, llm_provider, llm_model = _resolve_llm()

lead_analyst = Agent(
    role="Automotive Lead Scoring Specialist",
    goal="Analyze customer inquiries and return structured lead assessments for Mark Miller Subaru South Towne",
    backstory=(
        "You are an expert in automotive retail lead scoring with deep knowledge of Subaru vehicles and Utah buyers. "
        "Mark Miller Subaru is a non-commissioned dealership with Promise Pricing - no negotiation, no pressure. "
        "You understand Utah buyers and match people to vehicles based on life context first."
    ),
    llm=llm,
    verbose=False,
)

comms_specialist = Agent(
    role="Customer Experience Specialist",
    goal="Write warm personalized emails that feel like they came from a real person who genuinely read what the customer said",
    backstory=(
        "You write emails for Mark Miller Subaru South Towne in an honest, warm, zero-pressure tone. "
        "Never sound like a template. Lead with the person and their details, not the product."
    ),
    llm=llm,
    verbose=False,
)
