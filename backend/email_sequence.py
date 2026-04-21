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
            "body": f"Hi {name},\n\nCongrats on your {vehicle}. {specialist} and the team are excited for you.",
        },
        {
            "num": 2,
            "subject": f"Quick setup tips for your {vehicle}",
            "body": f"Hi {name},\n\nHere are a few setup tips so you can get the most from your {vehicle} this week.",
        },
        {
            "num": 3,
            "subject": f"{vehicle} ownership support from our team",
            "body": f"Hi {name},\n\nIf you have any questions about features or maintenance, just reply to this email.",
        },
        {
            "num": 4,
            "subject": "Thank you from Mark Miller Subaru",
            "body": f"Hi {name},\n\nThank you again for choosing us. We are always here for you.",
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
                html_body=f"<p>{template['body'].replace(chr(10), '<br/>')}</p>",
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