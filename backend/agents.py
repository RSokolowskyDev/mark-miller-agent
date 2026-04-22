import os
from dotenv import load_dotenv
from crewai import Agent, LLM

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
if not groq_api_key:
    raise RuntimeError("Missing GROQ_API_KEY. Add it to backend/.env before starting the backend.")

llm = LLM(
    model=os.getenv("LLM_MODEL", "groq/llama-3.1-8b-instant"),
    api_key=groq_api_key,
)

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
