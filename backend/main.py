import asyncio
import os
from typing import Optional
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from crew import run_lead_pipeline
from database import (
    get_all_leads,
    get_lead,
    init_db,
    mark_converted,
    save_lead,
    update_lead_status,
)
from email_sequence import trigger_post_sale_sequence
from mailer import send_email


class FormData(BaseModel):
    name: str
    intent: str
    model: str
    budget: str
    tradeIn: Optional[str] = None
    paymentMethod: str
    timeline: str
    context: str
    email: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class ConvertRequest(BaseModel):
    email: Optional[str] = None
    vehicle: str


class ManualEmailRequest(BaseModel):
    to: str
    subject: str
    htmlBody: str
    body: str
    fromName: Optional[str] = "Mark Miller Subaru"


app = FastAPI(title="Mark Miller Subaru AI Lead Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


async def _delayed_initial_email(to: str, subject: str, html: str, body: str, from_name: str) -> None:
    await asyncio.sleep(90)
    send_email(to=to, subject=subject, html_body=html, body=body, from_name=from_name)


@app.post("/analyze")
async def analyze(form_data: FormData, background_tasks: BackgroundTasks):
    try:
        result = run_lead_pipeline(form_data.dict())
        assessment = result["assessment"]
        email = result["email"]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Lead pipeline failed: {str(exc)}")

    lead_payload = {
        **form_data.dict(),
        **assessment,
        "email_subject": email.get("subject", ""),
        "email_body": email.get("body", ""),
        "email_html": email.get("html", ""),
    }
    lead_id = save_lead(lead_payload)

    if form_data.email:
        background_tasks.add_task(
            _delayed_initial_email,
            form_data.email,
            email.get("subject", "Your personalized Subaru follow-up"),
            email.get("html", ""),
            email.get("body", ""),
            email.get("fromName", assessment.get("assignedSpecialist", "Mark Miller Subaru")),
        )

    return {"leadId": lead_id, "assessment": assessment, "email": email}


@app.get("/leads")
async def leads():
    return get_all_leads()


@app.get("/leads/{lead_id}")
async def lead(lead_id: str):
    item = get_lead(lead_id)
    if not item:
        raise HTTPException(status_code=404, detail="Lead not found")
    return item


@app.patch("/leads/{lead_id}/status")
async def patch_status(lead_id: str, request: StatusUpdate):
    update_lead_status(lead_id, request.status)
    return {"success": True}


@app.post("/leads/{lead_id}/convert")
async def convert(lead_id: str, request: ConvertRequest, background_tasks: BackgroundTasks):
    lead_item = get_lead(lead_id)
    if not lead_item:
        raise HTTPException(status_code=404, detail="Lead not found")

    sequence_email = (lead_item.get("email") or request.email or "").strip()
    if not sequence_email:
        raise HTTPException(
            status_code=400,
            detail="No customer email is saved on this lead. Add it in the form before conversion.",
        )

    mark_converted(lead_id)
    background_tasks.add_task(trigger_post_sale_sequence, lead_id, sequence_email, request.vehicle)
    return {"success": True, "message": "Sequence triggered"}


@app.post("/send-email")
async def manual_send_email(request: ManualEmailRequest):
    send_email(
        to=request.to,
        subject=request.subject,
        html_body=request.htmlBody,
        body=request.body,
        from_name=request.fromName or "Mark Miller Subaru",
    )
    return {"success": True}


@app.get("/health")
async def health():
    provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    if not provider:
        if (os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()):
            provider = "gemini"
        elif os.getenv("GROQ_API_KEY", "").strip():
            provider = "groq"
        else:
            provider = "unconfigured"

    default_model = "unconfigured"
    if provider == "gemini":
        default_model = "gemini/gemini-1.5-flash"
    elif provider == "groq":
        default_model = "groq/llama-3.1-8b-instant"

    return {
        "status": "ok",
        "provider": provider,
        "model": os.getenv("LLM_MODEL", default_model),
    }
