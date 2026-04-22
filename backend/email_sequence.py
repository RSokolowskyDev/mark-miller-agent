import asyncio
from datetime import datetime
from database import append_email_sent, get_lead
from mailer import send_email


def _sequence_templates(lead: dict, vehicle: str):
    name = lead.get("name", "there")
    specialist = lead.get("assigned_specialist", "our team")
    budget = lead.get("budget") or "your budget"
    timeline = lead.get("timeline") or "your timeline"
    payment = lead.get("payment_method") or "your preferred payment plan"
    first_time = (lead.get("first_time_buyer") or "").strip().lower()
    owned_new = (lead.get("owned_new_vehicle") or "").strip().lower()
    context = (lead.get("context") or "").strip()
    trade_in = (lead.get("trade_in") or "").strip()

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

    return [
        {
            "num": 1,
            "subject": f"{name}, congrats on your {vehicle}",
            "body": (
                f"Hi {name},\n\n"
                f"Congrats on your {vehicle} and welcome to the Mark Miller Subaru family.\n\n"
                f"{specialist} and the team are excited to support you from day one. {buyer_support_line}\n\n"
                "If you want a quick orientation on your top features, reply and we will set it up.\n\n"
                "We are grateful for the opportunity to earn your business."
            ),
        },
        {
            "num": 2,
            "subject": f"Quick setup tips for your {vehicle}",
            "body": (
                f"Hi {name},\n\n"
                f"Here are quick ways to get the most from your {vehicle} this week (based on your {timeline} timeline and {payment} planning):\n"
                "- Save seat and mirror presets for each driver.\n"
                "- Pair phones and favorite maps/music apps.\n"
                "- Review your drive modes for city, highway, and mountain weather.\n\n"
                f"{ownership_line}\n\n"
                "If you want, we can walk through these together in under 15 minutes."
            ),
        },
        {
            "num": 3,
            "subject": f"{vehicle} ownership support from our team",
            "body": (
                f"Hi {name},\n\n"
                "Just checking in to make sure everything is feeling great so far.\n\n"
                f"We kept your goals in mind: {context_snippet or 'fit, comfort, and confidence in daily driving.'}\n\n"
                "If you have questions on features, accessories, service scheduling, or anything else, "
                "reply directly and we will take care of it."
            ),
        },
        {
            "num": 4,
            "subject": "Thank you from Mark Miller Subaru",
            "body": (
                f"Hi {name},\n\n"
                "Thank you again for choosing Mark Miller Subaru South Towne.\n\n"
                f"We are here for long-term ownership support, from service planning to feature help within your {budget} comfort range"
                f"{' and trade-in planning for ' + trade_in if trade_in else ''}.\n\n"
                "Our relationship does not end at delivery. We are here for ongoing support, "
                "future service needs, and any questions as you settle in."
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
