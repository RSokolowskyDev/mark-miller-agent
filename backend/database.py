import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent / "leads.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = conn.execute(f"PRAGMA table_info({table})").fetchall()
    existing = {row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in columns}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                name TEXT,
                intent TEXT,
                model TEXT,
                budget TEXT,
                trade_in TEXT,
                payment_method TEXT,
                timeline TEXT,
                context TEXT,
                email TEXT,
                score INTEGER,
                tier TEXT,
                urgency TEXT,
                signals TEXT,
                recommended_model TEXT,
                assigned_specialist TEXT,
                summary TEXT,
                routing_reason TEXT,
                best_next_step TEXT,
                talking_points TEXT,
                objections TEXT,
                personal_details TEXT,
                email_subject TEXT,
                email_body TEXT,
                email_html TEXT,
                status TEXT DEFAULT 'new',
                emails_sent TEXT DEFAULT '[]',
                created_at TEXT,
                converted_at TEXT
            )
            """
        )
        _ensure_column(conn, "leads", "first_time_buyer", "TEXT")
        _ensure_column(conn, "leads", "owned_new_vehicle", "TEXT")
        _ensure_column(conn, "leads", "purchase_style", "TEXT")
        _ensure_column(conn, "leads", "extra_notes", "TEXT")
        _ensure_column(conn, "leads", "specialist_profile", "TEXT")
        _ensure_column(conn, "leads", "best_next_step", "TEXT")
        conn.commit()


def save_lead(lead_dict: Dict[str, Any]) -> str:
    lead_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()

    payload = {
        "id": lead_id,
        "name": lead_dict.get("name"),
        "intent": lead_dict.get("intent"),
        "model": lead_dict.get("model"),
        "budget": lead_dict.get("budget"),
        "trade_in": lead_dict.get("tradeIn") or lead_dict.get("trade_in"),
        "payment_method": lead_dict.get("paymentMethod") or lead_dict.get("payment_method"),
        "timeline": lead_dict.get("timeline"),
        "context": lead_dict.get("context"),
        "first_time_buyer": lead_dict.get("firstTimeBuyer") or lead_dict.get("first_time_buyer"),
        "owned_new_vehicle": lead_dict.get("ownedNewVehicle") or lead_dict.get("owned_new_vehicle"),
        "purchase_style": lead_dict.get("purchaseStyle") or lead_dict.get("purchase_style"),
        "extra_notes": lead_dict.get("extraNotes") or lead_dict.get("extra_notes"),
        "email": lead_dict.get("email"),
        "score": lead_dict.get("score", 0),
        "tier": lead_dict.get("tier", "Cold"),
        "urgency": lead_dict.get("urgency", "Browsing"),
        "signals": json.dumps(lead_dict.get("signals", [])),
        "recommended_model": lead_dict.get("recommendedModel") or lead_dict.get("recommended_model"),
        "assigned_specialist": lead_dict.get("assignedSpecialist") or lead_dict.get("assigned_specialist"),
        "summary": lead_dict.get("summary", ""),
        "routing_reason": lead_dict.get("routingReason") or lead_dict.get("routing_reason", ""),
        "best_next_step": json.dumps(lead_dict.get("bestNextStep") or lead_dict.get("best_next_step") or {}),
        "talking_points": json.dumps(lead_dict.get("talkingPoints") or lead_dict.get("talking_points", [])),
        "objections": json.dumps(lead_dict.get("potentialObjections") or lead_dict.get("objections", [])),
        "personal_details": lead_dict.get("personalDetails") or lead_dict.get("personal_details", ""),
        "specialist_profile": json.dumps(
            lead_dict.get("specialistProfile") or lead_dict.get("specialist_profile") or {}
        ),
        "email_subject": lead_dict.get("email_subject", ""),
        "email_body": lead_dict.get("email_body", ""),
        "email_html": lead_dict.get("email_html", ""),
        "status": lead_dict.get("status", "new"),
        "emails_sent": json.dumps(lead_dict.get("emails_sent", [])),
        "created_at": lead_dict.get("created_at", created_at),
        "converted_at": lead_dict.get("converted_at"),
    }

    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))

    with _connect() as conn:
        conn.execute(
            f"INSERT INTO leads ({columns}) VALUES ({placeholders})",
            list(payload.values()),
        )
        conn.commit()

    return lead_id


def _decode_row(row: sqlite3.Row) -> Dict[str, Any]:
    if row is None:
        return {}
    item = dict(row)
    for field in ["signals", "talking_points", "objections", "emails_sent", "specialist_profile", "best_next_step"]:
        try:
            default = "{}" if field in {"specialist_profile", "best_next_step"} else "[]"
            item[field] = json.loads(item[field] or default)
        except json.JSONDecodeError:
            item[field] = {} if field in {"specialist_profile", "best_next_step"} else []
    return item


def get_all_leads() -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM leads ORDER BY datetime(created_at) DESC").fetchall()
    return [_decode_row(r) for r in rows]


def get_lead(lead_id: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    if not row:
        return None
    return _decode_row(row)


def update_lead_status(lead_id: str, status: str) -> None:
    with _connect() as conn:
        conn.execute("UPDATE leads SET status = ? WHERE id = ?", (status, lead_id))
        conn.commit()


def mark_converted(lead_id: str) -> None:
    converted_at = datetime.utcnow().isoformat()
    with _connect() as conn:
        conn.execute(
            "UPDATE leads SET status = 'converted', converted_at = ? WHERE id = ?",
            (converted_at, lead_id),
        )
        conn.commit()


def append_email_sent(lead_id: str, email_record: Dict[str, Any]) -> None:
    lead = get_lead(lead_id)
    if not lead:
        return

    sent = lead.get("emails_sent", [])
    sent.append(email_record)

    with _connect() as conn:
        conn.execute(
            "UPDATE leads SET emails_sent = ? WHERE id = ?",
            (json.dumps(sent), lead_id),
        )
        conn.commit()
