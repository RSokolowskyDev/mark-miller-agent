import asyncio
from datetime import datetime
from database import append_email_sent, get_lead
from mailer import send_email


def _sequence_templates(lead: dict, vehicle: str):
    name = lead.get("name", "there")
    specialist = lead.get("assigned_specialist", "our team")
    return [
        {
            "num": 1,
            "subject": f"{name}, congrats on your {vehicle}",
            "body": (
                f"Hi {name},\n\n"
                f"Congrats on your {vehicle} and welcome to the Mark Miller Subaru family.\n\n"
                f"{specialist} and the team are excited to support you from day one. "
                "If you want a quick orientation on your top features, reply and we will set it up.\n\n"
                "We are grateful for the opportunity to earn your business."
            ),
        },
        {
            "num": 2,
            "subject": f"Quick setup tips for your {vehicle}",
            "body": (
                f"Hi {name},\n\n"
                f"Here are quick ways to get the most from your {vehicle} this week:\n"
                "- Save seat and mirror presets for each driver.\n"
                "- Pair phones and favorite maps/music apps.\n"
                "- Review your drive modes for city, highway, and mountain weather.\n\n"
                "If you want, we can walk through these together in under 15 minutes."
            ),
        },
        {
            "num": 3,
            "subject": f"{vehicle} ownership support from our team",
            "body": (
                f"Hi {name},\n\n"
                "Just checking in to make sure everything is feeling great so far.\n\n"
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
