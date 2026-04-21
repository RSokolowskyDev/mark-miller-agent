import json
import re
from crewai import Crew, Process
from tasks import create_scoring_task, create_initial_email_task


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def run_lead_pipeline(form_data: dict) -> dict:
    scoring_task = create_scoring_task(form_data)
    scoring_crew = Crew(tasks=[scoring_task], process=Process.sequential, verbose=False)
    scoring_result = scoring_crew.kickoff()
    assessment = _extract_json(str(scoring_result))

    email_task = create_initial_email_task(form_data, assessment)
    email_crew = Crew(tasks=[email_task], process=Process.sequential, verbose=False)
    email_result = email_crew.kickoff()
    email_json = _extract_json(str(email_result))

    return {
        "assessment": assessment,
        "email": email_json,
    }