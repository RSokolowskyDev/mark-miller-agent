import os
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from email_templates import build_polished_email_html, resolve_local_email_images

load_dotenv()


def send_email(to: str, subject: str, html_body: str, body: str, from_name: str = "Mark Miller Subaru") -> None:
    gmail_user = os.getenv("GMAIL_USER")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_password:
        raise RuntimeError("Missing GMAIL_USER or GMAIL_APP_PASSWORD")

    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{gmail_user}>"
    msg["To"] = to

    alt_part = MIMEMultipart("alternative")
    msg.attach(alt_part)

    plain_text = body or ""
    hero_src = ""
    badge_src = ""
    local_images = resolve_local_email_images()
    hero_path = local_images.get("hero")
    badge_path = local_images.get("badge")

    if hero_path and hero_path.exists():
        hero_src = "cid:hero-image"
    if badge_path and badge_path.exists():
        badge_src = "cid:badge-image"

    polished_html = build_polished_email_html(
        subject=subject,
        body_content=html_body or body or "",
        from_name=from_name,
        hero_src=hero_src,
        badge_src=badge_src,
    )

    alt_part.attach(MIMEText(plain_text, "plain"))
    alt_part.attach(MIMEText(polished_html, "html"))

    if hero_src and hero_path:
        with open(hero_path, "rb") as fh:
            hero_image = MIMEImage(fh.read())
        hero_image.add_header("Content-ID", "<hero-image>")
        hero_image.add_header("Content-Disposition", "inline", filename=hero_path.name)
        msg.attach(hero_image)

    if badge_src and badge_path:
        with open(badge_path, "rb") as fh:
            badge_image = MIMEImage(fh.read())
        badge_image.add_header("Content-ID", "<badge-image>")
        badge_image.add_header("Content-Disposition", "inline", filename=badge_path.name)
        msg.attach(badge_image)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_app_password)
        server.sendmail(gmail_user, [to], msg.as_string())
