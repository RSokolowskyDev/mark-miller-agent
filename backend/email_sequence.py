import asyncio
import json
import re
from datetime import datetime
from database import append_email_sent, get_lead
from mailer import send_email


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _parse_listish(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]

    raw = str(value).strip()
    if not raw:
        return []

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(v).strip() for v in parsed if str(v).strip()]
    except Exception:
        pass

    parts = re.split(r"[,|/]", raw)
    return [p.strip() for p in parts if p.strip()]


def _context_callback(context: str) -> str:
    text = context.lower()
    if any(term in text for term in ["ski", "snow", "mountain", "canyon"]):
        return "Have you had a chance to take the car up the canyon yet, and how did it feel in mountain conditions?"
    if any(term in text for term in ["camp", "outdoor", "adventure", "moab"]):
        return "Have you gotten to use the car for one of the trips you mentioned, and did cargo space feel right?"
    if any(term in text for term in ["kid", "family", "car seat", "school"]):
        return "How has the day-to-day family setup in the car felt so far, especially around loading kids and gear?"
    if any(term in text for term in ["commute", "highway", "traffic"]):
        return "How is the car feeling on your normal commute so far compared with your previous vehicle?"
    return "How has the first week with the car felt so far compared with what you were hoping for?"


def _service_focus(context: str, priorities: list[str]) -> str:
    text = context.lower()
    priorities_text = " ".join(priorities).lower()
    if any(term in text for term in ["snow", "ski", "mountain"]) or "awd" in priorities_text:
        return (
            "Because you mentioned winter confidence, we can set a quick seasonal check plan "
            "(tires, alignment, and AWD confidence check) around your driving routine."
        )
    if any(term in text for term in ["family", "kids"]) or "safety" in priorities_text:
        return (
            "Because safety and family use came up in your form, we can set reminders around "
            "the inspections that matter most for busy family driving."
        )
    return (
        "Based on your goals from the form, we can build a simple service cadence "
        "that keeps ownership easy without overcomplicating it."
    )


def _sequence_templates(lead: dict, vehicle: str):
    name = _safe_text(lead.get("name")) or "there"
    specialist = _safe_text(lead.get("assigned_specialist")) or "our team"
    budget = _safe_text(lead.get("budget")) or "your budget"
    timeline = _safe_text(lead.get("timeline")) or "your timeline"
    payment = _safe_text(lead.get("payment_method")) or "your preferred payment plan"
    first_time = _safe_text(lead.get("first_time_buyer")).lower()
    owned_new = _safe_text(lead.get("owned_new_vehicle")).lower()
    context = _safe_text(lead.get("context"))
    trade_in = _safe_text(lead.get("trade_in"))
    usage_items = _parse_listish(lead.get("usage"))
    priority_items = _parse_listish(lead.get("priorities"))
    follow_up = _safe_text(lead.get("follow_up_preference")).lower()

    buyer_support_line = (
        "Since this is your first purchase path, we can walk you through every step in plain language."
        if "first" in first_time or first_time.startswith("yes")
        else "We can keep this efficient and focused based on what already works for you."
    )
    ownership_line = (
        "If this is your first new-vehicle ownership experience, we can also give you a quick ownership walkthrough."
        if "no" in owned_new
        else "If helpful, we can tailor setup tips to how you have used previous vehicles."
    )
    context_snippet = context[:220] + ("..." if len(context) > 220 else "")
    callback_prompt = _context_callback(context)
    service_line = _service_focus(context, priority_items)
    usage_line = ", ".join(usage_items[:2]) if usage_items else "your day-to-day driving"
    priority_line = ", ".join(priority_items[:2]) if priority_items else "the priorities you shared"
    channel_line = (
        "I can keep updates brief by text."
        if "text" in follow_up
        else "I can send details by email so you can review on your own time."
        if "email" in follow_up
        else "I can call you with a direct quick update."
    )

    return [
        {
            "num": 1,
            "subject": f"{name}, thanks again for coming in",
            "body": (
                f"Hi {name},\n\n"
                f"Thanks again for spending time with us and moving forward with your {vehicle}.\n\n"
                f"I appreciated learning more about your goals around {usage_line} and {priority_line}. "
                f"{buyer_support_line}\n\n"
                f"{callback_prompt}\n\n"
                f"If you want, I can send a quick owner tips list tuned to your {timeline} plans and {payment} setup."
            ),
        },
        {
            "num": 2,
            "subject": f"{vehicle} setup based on your routine",
            "body": (
                f"Hi {name},\n\n"
                f"Based on what you shared in the form, here are the best setup steps for your {vehicle} this week:\n"
                f"- Set driver profiles around {usage_line}.\n"
                "- Pair phone/navigation and save your most-used destinations.\n"
                "- Review the drive mode and safety settings that support your top priorities.\n\n"
                f"{ownership_line}\n\n"
                f"{channel_line} If you want, we can walk through this in under 15 minutes."
            ),
        },
        {
            "num": 3,
            "subject": f"Quick check-in on your {vehicle} so far",
            "body": (
                f"Hi {name},\n\n"
                "Quick post-delivery check-in from me.\n\n"
                f"When we reviewed options, your goals were clear: {context_snippet or 'fit, comfort, and confidence in daily driving.'}\n\n"
                f"{callback_prompt}\n\n"
                "If anything is not feeling right yet, reply and I will help fine-tune it."
            ),
        },
        {
            "num": 4,
            "subject": f"{name}, long-term support for your {vehicle}",
            "body": (
                f"Hi {name},\n\n"
                "As you settle into ownership, I wanted to share one final tailored note.\n\n"
                f"{service_line}\n\n"
                f"We are here for long-term support, from feature help to service planning within your {budget} comfort range"
                f"{' and trade-in planning for ' + trade_in if trade_in else ''}.\n\n"
                "Our support does not end at delivery. Reply directly whenever you need anything."
            ),
        },
    ]


async def trigger_post_sale_sequence(lead_id: str, email: str, vehicle: str) -> None:
    lead = get_lead(lead_id)
    if not lead:
        return

    for template in _sequence_templates(lead, vehicle):
        status = "sent"
        error = None
        try:
            send_email(
                to=email,
                subject=template["subject"],
                html_body=template["body"],
                body=template["body"],
                from_name=lead.get("assigned_specialist") or "Mark Miller Subaru",
                include_cta=False,
            )
        except Exception as exc:
            status = "failed"
            error = str(exc)

        append_email_sent(
            lead_id,
            {
                "emailNumber": template["num"],
                "subject": template["subject"],
                "sentAt": datetime.utcnow().isoformat(),
                "status": status,
                "error": error,
            },
        )

        if template["num"] < 4:
            await asyncio.sleep(30)
