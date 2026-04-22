import html
import os
from pathlib import Path


def _normalize_linebreaks(text: str) -> str:
    return str(text or "").replace("\r\n", "\n").replace("\r", "\n")


def _as_safe_html(text_or_html: str) -> str:
    content = _normalize_linebreaks(text_or_html).strip()
    if not content:
        return ""

    # If content already appears to be HTML, keep it.
    if "<" in content and ">" in content:
        return content

    paragraphs = [chunk.strip() for chunk in content.split("\n\n") if chunk.strip()]
    if not paragraphs:
        return ""

    rendered = []
    for paragraph in paragraphs:
        safe = html.escape(paragraph).replace("\n", "<br/>")
        rendered.append(
            f'<p style="margin:0 0 14px; font-size:16px; line-height:1.6; color:#0f172a;">{safe}</p>'
        )
    return "".join(rendered)


def normalize_email_body_text(text: str) -> str:
    normalized = _normalize_linebreaks(text).strip()
    if not normalized:
        return ""

    lines = normalized.split("\n")
    trimmed = list(lines)

    # Remove trailing signature-ish lines added by model output.
    while trimmed and not trimmed[-1].strip():
        trimmed.pop()

    signature_markers = (
        "product specialist",
        "mark miller subaru",
        "alex rivera",
        "jordan mack",
        "taylor brooks",
        "casey morgan",
        "sam wilder",
        "drew callahan",
        "morgan ellis",
        "ryan sokolowsky",
    )

    while trimmed:
        tail = trimmed[-1].strip().lower()
        if not tail:
            trimmed.pop()
            continue
        if tail.startswith("-"):
            trimmed.pop()
            continue
        if any(marker in tail for marker in signature_markers):
            trimmed.pop()
            continue
        break

    return "\n".join(trimmed).strip()


def resolve_local_email_images() -> dict:
    project_root = Path(__file__).resolve().parents[1]
    images_dir = project_root / "images"
    hero_path = Path(
        os.getenv("EMAIL_HERO_IMAGE_PATH", str(images_dir / "Untitled.png")).strip()
    )
    badge_path = Path(
        os.getenv("EMAIL_BADGE_IMAGE_PATH", str(images_dir / "1.png")).strip()
    )
    return {"hero": hero_path, "badge": badge_path}


def build_polished_email_html(
    subject: str,
    body_content: str,
    from_name: str = "Mark Miller Subaru",
    hero_src: str = "",
    badge_src: str = "",
) -> str:
    subject_safe = html.escape(str(subject or "Mark Miller Subaru Follow-Up"))
    from_name_safe = html.escape(str(from_name or "Mark Miller Subaru"))
    clean_body = normalize_email_body_text(body_content)
    content_html = _as_safe_html(clean_body)

    cta_url = os.getenv(
        "EMAIL_CTA_URL",
        "https://www.markmillersubarusouthtowne.com/inventory/new/Subaru",
    ).strip()
    cta_url_safe = html.escape(cta_url)

    asset_base = os.getenv(
        "EMAIL_ASSET_BASE_URL",
        "https://rsokolowskydev.github.io/mark-miller-agent/images",
    ).strip().rstrip("/")
    hero_image = (
        hero_src.strip()
        or os.getenv("EMAIL_HERO_IMAGE_URL", f"{asset_base}/Untitled.png").strip()
    )
    badge_image = (
        badge_src.strip()
        or os.getenv("EMAIL_BADGE_IMAGE_URL", f"{asset_base}/1.png").strip()
    )
    hero_image_safe = html.escape(hero_image)
    badge_image_safe = html.escape(badge_image)

    return f"""\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{subject_safe}</title>
  </head>
  <body style="margin:0; padding:0; background:#eef3fb; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3fb; padding:20px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px; max-width:100%; background:#ffffff; border:1px solid #dbe4f3; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(120deg, #0f2f6d 0%, #1f56c2 100%); padding:20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="font-size:12px; letter-spacing:1px; color:#bfdbfe; text-transform:uppercase; font-weight:700;">
                        Mark Miller Subaru South Towne
                      </div>
                      <div style="font-size:22px; color:#ffffff; font-weight:700; margin-top:6px;">
                        Personalized Follow-Up
                      </div>
                      <div style="font-size:14px; color:#dbeafe; margin-top:6px;">
                        {from_name_safe}
                      </div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <img src="{badge_image_safe}" alt="Subaru badge" width="84" style="display:block; width:84px; max-width:84px; height:auto; border:0;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <img src="{hero_image_safe}" alt="Mark Miller Subaru" width="640" style="display:block; width:100%; height:auto; border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 20px;">
                <h1 style="margin:0 0 14px; font-size:24px; line-height:1.25; color:#0f172a;">{subject_safe}</h1>
                {content_html}
                <p style="margin:14px 0 0; font-size:16px; line-height:1.6; color:#0f172a;">
                  Best,<br/>
                  <strong>{from_name_safe}</strong><br/>
                  Product Specialist
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:10px;">
                  <tr>
                    <td align="center" style="border-radius:8px; background:#2563eb;">
                      <a href="{cta_url_safe}" style="display:inline-block; padding:12px 20px; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none;">
                        Browse New Inventory
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0; background:#f8fafc; padding:16px 28px;">
                <p style="margin:0; font-size:12px; line-height:1.6; color:#475569;">
                  Mark Miller Subaru South Towne | 10920 State St, Sandy, UT 84070
                </p>
                <p style="margin:4px 0 0; font-size:12px; line-height:1.6; color:#475569;">
                  Reply directly to this email and our team will help right away.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
