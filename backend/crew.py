import json
import re
from crewai import Crew, Process
from tasks import create_scoring_task, create_initial_email_task


def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}


def _default_assessment(form_data: dict) -> dict:
    model = form_data.get("model") or "Outback"
    context = form_data.get("context") or "Customer is exploring options and shared limited context."
    return {
        "score": 55,
        "tier": "Warm",
        "urgency": "This Month",
        "signals": [{"text": "Submitted a detailed inquiry", "type": "positive"}],
        "recommendedModel": model,
        "assignedSpecialist": "Casey Morgan",
        "summary": f"{form_data.get('name', 'Customer')} is exploring a Subaru that fits their daily life.",
        "routingReason": "Casey is a strong fit for customers in active research and comparison stage.",
        "talkingPoints": [
            "Confirm daily use, cargo needs, and family/passenger setup.",
            "Walk through trim levels in budget range.",
            "Offer side-by-side comparison with similar models.",
            "Share next-step options with low-pressure scheduling.",
        ],
        "potentialObjections": [
            {
                "objection": "Unsure about model fit",
                "response": "Offer a quick needs-based walkthrough and practical comparison.",
            },
            {
                "objection": "Budget concerns",
                "response": "Show transparent pricing and payment options clearly.",
            },
        ],
        "personalDetails": context,
    }


def _default_email(form_data: dict, assessment: dict) -> dict:
    name = form_data.get("name", "there")
    specialist = assessment.get("assignedSpecialist", "Casey Morgan")
    model = assessment.get("recommendedModel", form_data.get("model", "Subaru"))
    body = (
        f"Hi {name},\n\n"
        f"Thanks for sharing those details. I read through your note and wanted to personally reach out.\n\n"
        f"Based on what you shared, {model} could be a strong fit. If you want, I can send a quick side-by-side "
        "comparison and a no-pressure next-step plan.\n\n"
        f"- {specialist}\nMark Miller Subaru South Towne"
    )
    return {
        "subject": f"{name}, a quick follow-up on your Subaru options",
        "body": body,
        "html": "<p>" + body.replace("\n", "<br/>") + "</p>",
        "fromName": specialist,
    }


def _normalize_assessment(raw: dict, form_data: dict) -> dict:
    base = _default_assessment(form_data)
    if not isinstance(raw, dict):
        return base

    merged = {**base, **raw}
    merged["signals"] = raw.get("signals") if isinstance(raw.get("signals"), list) else base["signals"]
    merged["talkingPoints"] = (
        raw.get("talkingPoints") if isinstance(raw.get("talkingPoints"), list) else base["talkingPoints"]
    )
    merged["potentialObjections"] = (
        raw.get("potentialObjections")
        if isinstance(raw.get("potentialObjections"), list)
        else base["potentialObjections"]
    )
    merged["score"] = int(merged.get("score", base["score"])) if str(merged.get("score", "")).isdigit() else base["score"]

    # Guard DB-bound text fields against non-string model outputs.
    text_fields = [
        "tier",
        "urgency",
        "recommendedModel",
        "assignedSpecialist",
        "summary",
        "routingReason",
        "personalDetails",
    ]
    for field in text_fields:
        value = merged.get(field, base.get(field, ""))
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        merged[field] = str(value) if value is not None else str(base.get(field, ""))

    return merged


def _normalize_email(raw: dict, form_data: dict, assessment: dict) -> dict:
    base = _default_email(form_data, assessment)
    if not isinstance(raw, dict):
        return base
    merged = {**base, **raw}
    merged["subject"] = str(merged.get("subject") or base["subject"])
    merged["body"] = str(merged.get("body") or base["body"])
    merged["html"] = str(merged.get("html") or base["html"])
    merged["fromName"] = str(merged.get("fromName") or base["fromName"])
    return merged


def run_lead_pipeline(form_data: dict) -> dict:
    assessment = _default_assessment(form_data)
    email_json = _default_email(form_data, assessment)

    try:
        scoring_task = create_scoring_task(form_data)
        scoring_crew = Crew(tasks=[scoring_task], process=Process.sequential, verbose=False)
        scoring_result = scoring_crew.kickoff()
        assessment = _normalize_assessment(_extract_json(str(scoring_result)), form_data)
    except Exception:
        assessment = _default_assessment(form_data)

    try:
        email_task = create_initial_email_task(form_data, assessment)
        email_crew = Crew(tasks=[email_task], process=Process.sequential, verbose=False)
        email_result = email_crew.kickoff()
        email_json = _normalize_email(_extract_json(str(email_result)), form_data, assessment)
    except Exception:
        email_json = _default_email(form_data, assessment)

    return {
        "assessment": assessment,
        "email": email_json,
    }
