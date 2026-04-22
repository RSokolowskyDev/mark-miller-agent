import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from email_templates import build_polished_email_html

load_dotenv()


def send_email(to: str, subject: str, html_body: str, body: str, from_name: str = "Mark Miller Subaru") -> None:
    gmail_user = os.getenv("GMAIL_USER")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_password:
        raise RuntimeError("Missing GMAIL_USER or GMAIL_APP_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{gmail_user}>"
    msg["To"] = to

    plain_text = body or ""
    polished_html = build_polished_email_html(
        subject=subject,
        body_content=html_body or body or "",
        from_name=from_name,
    )

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(polished_html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_app_password)
        server.sendmail(gmail_user, [to], msg.as_string())
