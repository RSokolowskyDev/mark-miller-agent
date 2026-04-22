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
    name = form_data.get("name", "Customer")
    context = str(form_data.get("context") or "").strip()
    context_word_count = len(context.split()) if context else 0

    trade_in = str(form_data.get("tradeIn") or "").strip()
    intent = str(form_data.get("intent") or "").lower()
    payment = str(form_data.get("paymentMethod") or "").lower()
    timeline = str(form_data.get("timeline") or "").lower()

    score = 35
    signals = []

    if "buy" in intent:
        score += 14
        signals.append({"text": "Purchase intent indicated", "type": "positive"})
    elif "brows" in intent:
        score += 4
        signals.append({"text": "Early research stage", "type": "neutral"})

    if timeline == "this week":
        score += 14
        urgency = "Immediate"
        signals.append({"text": "Decision timeline is this week", "type": "positive"})
    elif timeline == "this month":
        score += 8
        urgency = "This Month"
        signals.append({"text": "Decision timeline is this month", "type": "positive"})
    else:
        urgency = "Exploring"
        signals.append({"text": "No immediate purchase timeline", "type": "neutral"})

    if payment in {"finance", "lease", "cash"}:
        score += 8
        signals.append({"text": f"Payment preference captured ({payment.title()})", "type": "positive"})

    if model and str(model).lower() != "not sure yet":
        score += 9
        signals.append({"text": f"Specific model interest ({model})", "type": "positive"})

    if trade_in:
        score += 8
        signals.append({"text": "Trade-in details provided", "type": "positive"})

    if context_word_count >= 12:
        score += min(14, context_word_count // 6)
        signals.append({"text": "Detailed lifestyle context provided", "type": "positive"})
    else:
        signals.append({"text": "Limited lifestyle context", "type": "neutral"})

    score = max(25, min(95, score))
    if score >= 75:
        tier = "Hot"
    elif score >= 55:
        tier = "Warm"
    else:
        tier = "Cold"

    context_l = context.lower()
    model_l = str(model).lower()
    if model_l in {"wrx", "brz"}:
        specialist = "Sam Wilder"
        routing_reason = "Performance model interest is best handled by Sam."
    elif trade_in or "trade" in intent or "used" in intent:
        specialist = "Drew Callahan"
        routing_reason = "Trade-in and value-focused scenarios are Drew's specialty."
    elif "family" in context_l or "kid" in context_l or "children" in context_l:
        specialist = "Alex Rivera"
        routing_reason = "Family-focused shoppers are a strong fit for Alex."
    elif any(word in context_l for word in ["ski", "camp", "outdoor", "canyon", "moab"]):
        specialist = "Jordan Mack"
        routing_reason = "Outdoor lifestyle fit and utility usage align with Jordan's strengths."
    elif model_l in {"solterra"} or "ev" in intent or "electric" in context_l:
        specialist = "Taylor Brooks"
        routing_reason = "EV and technology-focused guidance aligns with Taylor."
    elif "$25" in str(form_data.get("budget", "")) or "under 25" in str(form_data.get("budget", "")).lower():
        specialist = "Morgan Ellis"
        routing_reason = "Budget-conscious planning aligns well with Morgan."
    else:
        specialist = "Casey Morgan"
        routing_reason = "Early-stage research and comparison support aligns with Casey."

    return {
        "score": score,
        "tier": tier,
        "urgency": urgency,
        "signals": signals,
        "recommendedModel": model,
        "assignedSpecialist": specialist,
        "summary": f"{name} is evaluating a {model} with a {timeline or 'flexible'} timeline and {tier.lower()} intent profile.",
        "routingReason": routing_reason,
        "talkingPoints": [
            "Reflect their exact lifestyle use-case before discussing trim and pricing.",
            "Confirm household/passenger and cargo needs with concrete examples.",
            "Position one primary recommendation and one practical fallback model.",
            "Provide transparent next steps with no-pressure scheduling.",
        ],
        "potentialObjections": [
            {
                "objection": "Unsure if this model is the best fit",
                "response": "Offer a side-by-side comparison focused on their real weekly use cases.",
            },
            {
                "objection": "Budget/payment uncertainty",
                "response": "Walk through total monthly options and value trade-offs transparently.",
            },
        ],
        "personalDetails": context or "Customer is exploring options and shared limited context.",
    }


def _default_email(form_data: dict, assessment: dict) -> dict:
    name = form_data.get("name", "there")
    specialist = assessment.get("assignedSpecialist", "Casey Morgan")
    model = assessment.get("recommendedModel", form_data.get("model", "Subaru"))
    budget = form_data.get("budget", "your budget")
    timeline = form_data.get("timeline", "your timeline")
    payment = form_data.get("paymentMethod", "your preferred payment style")
    context = str(form_data.get("context") or "").strip()
    body = (
        f"Hi {name},\n\n"
        "Thanks again for sharing what matters most in your next vehicle.\n\n"
        f"Based on your goals, I put together a starting recommendation around the {model}. "
        f"I can also send a side-by-side option set matched to {budget}, {payment}, and a {timeline} decision window.\n\n"
        f"What stood out from your note:\n{context or '- Family-first practicality and confident year-round capability.'}\n\n"
        "If you want, reply with your ideal day/time and I will have everything lined up before you arrive.\n\n"
        f"- {specialist}\nProduct Specialist\nMark Miller Subaru South Towne"
    )
    return {
        "subject": f"{name}, a quick follow-up on your Subaru options",
        "body": body,
        "html": body,
        "fromName": specialist,
    }


def _normalize_assessment(raw: dict, form_data: dict) -> dict:
    base = _default_assessment(form_data)
    if not isinstance(raw, dict):
        return base

    merged = {**base, **raw}
    if isinstance(raw.get("signals"), list):
        normalized_signals = []
        for signal in raw.get("signals"):
            if isinstance(signal, str):
                text = signal.strip()
                if text:
                    normalized_signals.append({"text": text, "type": "neutral"})
            elif isinstance(signal, dict):
                text = str(signal.get("text") or signal.get("label") or signal.get("title") or "").strip()
                signal_type = str(signal.get("type") or "neutral").lower().strip()
                if signal_type not in {"positive", "negative", "neutral"}:
                    signal_type = "neutral"
                if text:
                    normalized_signals.append({"text": text, "type": signal_type})
        merged["signals"] = normalized_signals or base["signals"]
    else:
        merged["signals"] = base["signals"]
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
