import json
import hashlib
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
    requested_model = str(form_data.get("model") or "").strip()
    context_for_model = str(form_data.get("context") or "").lower()
    if not requested_model or requested_model.lower() == "not sure yet":
        if any(term in context_for_model for term in ["big family", "3 kid", "4 kid", "5 kid", "kids"]):
            model = "Forester"
        elif any(term in context_for_model for term in ["ski", "snow", "camp", "outdoor", "cargo"]):
            model = "Outback"
        else:
            model = "Forester"
    else:
        model = requested_model
    name = form_data.get("name", "Customer")
    context = str(form_data.get("context") or "").strip()
    context_word_count = len(context.split()) if context else 0

    trade_in = str(form_data.get("tradeIn") or "").strip()
    intent = str(form_data.get("intent") or "").lower()
    payment = str(form_data.get("paymentMethod") or "").lower()
    timeline = str(form_data.get("timeline") or "").lower()
    first_time_buyer = str(form_data.get("firstTimeBuyer") or "").lower()
    owned_new_vehicle = str(form_data.get("ownedNewVehicle") or "").lower()
    purchase_style = str(form_data.get("purchaseStyle") or "").lower()
    extra_notes = str(form_data.get("extraNotes") or "").strip()

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

    if "first" in first_time_buyer:
        signals.append({"text": "First-time purchase journey", "type": "neutral"})
    if "no" in owned_new_vehicle:
        signals.append({"text": "Has not owned a new vehicle before", "type": "neutral"})
    if purchase_style:
        signals.append({"text": f"Shopping style: {purchase_style.title()}", "type": "positive"})

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

    profile = _generate_dynamic_specialist_profile(form_data, model, tier)
    specialist = profile["name"]
    routing_reason = profile["whyMatch"]
    next_best_step = _generate_next_best_step(form_data, model, tier)

    return {
        "score": score,
        "tier": tier,
        "urgency": urgency,
        "signals": signals,
        "recommendedModel": model,
        "assignedSpecialist": specialist,
        "summary": (
            f"{name} is evaluating a {model} with a {timeline or 'flexible'} timeline and {tier.lower()} intent profile. "
            f"Buying style: {purchase_style or 'not specified'}."
        ),
        "routingReason": routing_reason,
        "specialistProfile": profile,
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
        "personalDetails": (
            (
                context
                or "Customer is exploring options and shared limited context."
            )
            + (f" Additional notes: {extra_notes}" if extra_notes else "")
        ),
        "nextBestStep": next_best_step,
    }


def _generate_next_best_step(form_data: dict, model: str, tier: str) -> dict:
    timeline = str(form_data.get("timeline") or "").strip() or "timeline not specified"
    purchase_style = str(form_data.get("purchaseStyle") or "").strip().lower()
    first_time_buyer = str(form_data.get("firstTimeBuyer") or "").strip().lower()
    context = str(form_data.get("context") or "").strip()
    budget = str(form_data.get("budget") or "").strip() or "their budget"
    follow_up = str(form_data.get("followUpPreference") or "").strip().lower()

    if tier == "Hot":
        action = (
            f"Call this lead today and offer a 15-minute {model} fit conversation before their {timeline} window closes."
        )
    elif "email" in follow_up:
        action = (
            f"Send a concise email with two {model} options and one clear question to confirm their top priority this week."
        )
    elif "text" in follow_up:
        action = (
            f"Text one short message that offers two {model} directions and asks for the single most important must-have."
        )
    else:
        action = (
            f"Reach out with a low-pressure check-in and confirm whether a short {model} comparison would help next."
        )

    discovery_questions = [
        {
            "question": "Who else will be involved in the final vehicle decision besides you?",
            "rationale": "Decision-maker alignment changes how quickly this lead can move from interest to commitment.",
        },
        {
            "question": "What frustrates you most about your current vehicle day-to-day?",
            "rationale": "Current pain points reveal must-fix priorities that should guide trim and model recommendation.",
        },
        {
            "question": "Is your budget a strict cap or flexible if the right fit solves your biggest needs?",
            "rationale": f"With a stated budget around {budget}, this clarifies whether to optimize for value or absolute spend limit.",
        },
        {
            "question": "Have you visited or seriously considered other dealerships or models yet?",
            "rationale": "Competitive context helps the specialist tailor messaging and address unspoken objections early.",
        },
        {
            "question": (
                "Are there any life changes in the next 6-12 months (new commute, move, family changes) that this vehicle should handle?"
            ),
            "rationale": "Future-state needs can shift the best recommendation even when current requirements seem clear.",
        },
    ]

    if "first" in first_time_buyer:
        discovery_questions[0] = {
            "question": "Which part of the buying process feels most unclear or stressful right now?",
            "rationale": "Confidence support is critical for first-time buyers and directly affects pace and communication style.",
        }

    if context and len(context.split()) < 12:
        discovery_questions[4] = {
            "question": "Can you walk me through a typical weekday and weekend driving routine?",
            "rationale": "They shared limited lifestyle detail, so this fills key gaps before finalizing model-fit guidance.",
        }

    return {"action": action, "discoveryQuestions": discovery_questions}


def _generate_dynamic_specialist_profile(form_data: dict, model: str, tier: str) -> dict:
    name_seed = f"{form_data.get('name','')}-{form_data.get('context','')}-{form_data.get('intent','')}-{form_data.get('timeline','')}"
    digest = hashlib.sha256(name_seed.encode("utf-8")).hexdigest()
    idx = int(digest[:8], 16)

    first_names = ["Alex", "Jordan", "Taylor", "Casey", "Sam", "Drew", "Morgan", "Riley", "Avery", "Quinn"]
    last_names = ["Rivera", "Mack", "Brooks", "Morgan", "Wilder", "Callahan", "Ellis", "Parker", "Hayes", "Lane"]
    styles = ["Calm and consultative", "Efficient and direct", "Educational and patient", "High-energy and proactive"]
    titles = ["Senior Product Guide", "Customer Fit Specialist", "Vehicle Match Advisor", "Ownership Experience Specialist"]
    strengths_pool = [
        "Family fit interviews",
        "Trim-level recommendation",
        "Trade-in strategy",
        "Budget-to-value planning",
        "Tech and feature onboarding",
        "Outdoor lifestyle matching",
        "First-time buyer coaching",
        "Long-term ownership planning",
    ]

    name = f"{first_names[idx % len(first_names)]} {last_names[(idx // 7) % len(last_names)]}"
    style = styles[(idx // 13) % len(styles)]
    title = titles[(idx // 17) % len(titles)]
    tier_fit = f"{tier} lead conversion focus"

    intent = str(form_data.get("intent") or "").lower()
    context = str(form_data.get("context") or "").lower()
    strengths = []
    if "family" in context or "kid" in context:
        strengths.append("Family fit interviews")
    if "trade" in intent or str(form_data.get("tradeIn") or "").strip():
        strengths.append("Trade-in strategy")
    if any(k in context for k in ["ski", "camp", "outdoor", "snow", "moab"]):
        strengths.append("Outdoor lifestyle matching")
    if "first" in str(form_data.get("firstTimeBuyer") or "").lower():
        strengths.append("First-time buyer coaching")
    if model and str(model).lower() in {"solterra"}:
        strengths.append("Tech and feature onboarding")
    strengths.append(tier_fit)

    while len(strengths) < 4:
        candidate = strengths_pool[(idx + len(strengths) * 11) % len(strengths_pool)]
        if candidate not in strengths:
            strengths.append(candidate)

    strengths = strengths[:4]
    ideal_customers = [
        "Buyers with clear lifestyle requirements",
        "Customers who want transparent next steps",
        "Shoppers balancing budget and long-term value",
    ]
    why_match = (
        f"{name} matches this lead because their style is {style.lower()} and their strengths "
        f"align with the customer's goals ({', '.join(strengths[:2]).lower()})."
    )
    return {
        "name": name,
        "title": title,
        "style": style,
        "strengths": strengths,
        "idealCustomers": ideal_customers,
        "whyMatch": why_match,
    }


def _default_email(form_data: dict, assessment: dict) -> dict:
    name = form_data.get("name", "there")
    model = assessment.get("recommendedModel", form_data.get("model", "Subaru"))
    budget = form_data.get("budget", "your budget")
    timeline = form_data.get("timeline", "your timeline")
    payment = form_data.get("paymentMethod", "your preferred payment style")
    context = str(form_data.get("context") or "").strip()
    purchase_style = str(form_data.get("purchaseStyle") or "").strip()
    first_time_buyer = str(form_data.get("firstTimeBuyer") or "").strip()
    context_brief = context.split(".")[0].strip()
    if len(context_brief) > 110:
        context_brief = context_brief[:107] + "..."
    first_time_line = (
        "I will keep the recommendations very clear since this may be your first buying cycle.\n\n"
        if "first" in first_time_buyer.lower()
        else ""
    )
    body = (
        f"Hi {name},\n\n"
        f"Thanks for sharing what you need in your next vehicle. Based on your goals, {model} is a strong fit.\n\n"
        f"I can send 2 options matched to {budget}, {payment}, and your {timeline} timeline"
        f"{f' in a {purchase_style.lower()} style' if purchase_style else ''}.\n\n"
        f"{first_time_line}"
        f"Key detail I noted: {context_brief or 'Family-first practicality with confident all-weather capability.'}\n\n"
        "If you want, reply with your top priority and I will send the best two picks."
    )
    return {
        "subject": f"{name}, a quick follow-up on your Subaru options",
        "body": body,
        "html": body,
        "fromName": str(assessment.get("assignedSpecialist") or "Mark Miller Subaru Product Specialist"),
    }


def _is_bad_first_touch_email(body: str) -> bool:
    text = str(body or "").lower()
    prior_contact_phrases = [
        "great chatting",
        "great connecting",
        "as discussed",
        "yesterday",
        "again",
        "welcome back",
    ]
    if any(phrase in text for phrase in prior_contact_phrases):
        return True
    word_count = len(re.findall(r"\b\w+\b", text))
    return word_count > 150


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

    profile = raw.get("specialistProfile")
    if isinstance(profile, dict):
        merged["specialistProfile"] = {
            "name": str(profile.get("name") or merged["assignedSpecialist"]),
            "title": str(profile.get("title") or "Customer Fit Specialist"),
            "style": str(profile.get("style") or "Consultative"),
            "strengths": [str(item) for item in (profile.get("strengths") or [])][:6],
            "idealCustomers": [str(item) for item in (profile.get("idealCustomers") or [])][:6],
            "whyMatch": str(profile.get("whyMatch") or merged["routingReason"]),
        }
        merged["assignedSpecialist"] = merged["specialistProfile"]["name"]
        if not merged["routingReason"]:
            merged["routingReason"] = merged["specialistProfile"]["whyMatch"]
    else:
        merged["specialistProfile"] = base.get("specialistProfile", {})

    raw_next_step = raw.get("nextBestStep") or raw.get("bestNextStep")
    if isinstance(raw_next_step, str):
        merged["nextBestStep"] = {
            "action": raw_next_step.strip() or base["nextBestStep"]["action"],
            "discoveryQuestions": base["nextBestStep"]["discoveryQuestions"],
        }
    elif isinstance(raw_next_step, dict):
        questions = raw_next_step.get("discoveryQuestions")
        normalized_questions = []
        if isinstance(questions, list):
            for item in questions:
                if not isinstance(item, dict):
                    continue
                q = str(item.get("question") or "").strip()
                r = str(item.get("rationale") or "").strip()
                if q:
                    normalized_questions.append({"question": q, "rationale": r})
        merged["nextBestStep"] = {
            "action": str(raw_next_step.get("action") or base["nextBestStep"]["action"]),
            "discoveryQuestions": normalized_questions[:5] or base["nextBestStep"]["discoveryQuestions"],
        }
    else:
        merged["nextBestStep"] = base["nextBestStep"]

    return merged


def _normalize_email(raw: dict, form_data: dict, assessment: dict) -> dict:
    base = _default_email(form_data, assessment)
    if not isinstance(raw, dict):
        return base
    merged = {**base, **raw}
    merged["subject"] = str(merged.get("subject") or base["subject"])
    merged["body"] = str(merged.get("body") or base["body"])
    merged["html"] = str(merged.get("html") or base["html"])
    # Always keep sender identity aligned with the assigned Product Specialist.
    merged["fromName"] = str(
        assessment.get("assignedSpecialist")
        or base.get("fromName")
        or merged.get("fromName")
        or "Mark Miller Subaru Product Specialist"
    )
    if _is_bad_first_touch_email(merged["body"]):
        return base
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
