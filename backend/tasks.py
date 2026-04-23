from crewai import Task
from agents import lead_analyst, comms_specialist


def create_scoring_task(form_data: dict) -> Task:
    description = f"""
Analyze this customer inquiry for Mark Miller Subaru South Towne.
Focus on the PERSON first.

Available Product Specialists:
- Alex Rivera: families, first-time buyers, patient with questions
- Jordan Mack: outdoor enthusiasts, repeat Subaru customers
- Taylor Brooks: younger buyers, EV interest, tech features
- Casey Morgan: undecided customers, early research stage, browsers
- Sam Wilder: performance models (WRX, BRZ), enthusiast buyers
- Drew Callahan: trade-ins, used vehicles, value-focused buyers
- Morgan Ellis: bilingual Spanish/English, budget-conscious buyers

Customer data:
Name: {form_data.get('name')}
Intent: {form_data.get('intent')}
Model interest: {form_data.get('model')}
Budget: {form_data.get('budget')}
Trade-in: {form_data.get('tradeIn', 'None')}
Payment: {form_data.get('paymentMethod')}
Timeline: {form_data.get('timeline')}
First-time buyer: {form_data.get('firstTimeBuyer')}
Owned new vehicle before: {form_data.get('ownedNewVehicle')}
Shopping style: {form_data.get('purchaseStyle')}
Extra notes: {form_data.get('extraNotes')}
About them: {form_data.get('context')}

Return ONLY valid JSON with keys:
score, tier, urgency, signals, recommendedModel, assignedSpecialist,
summary, routingReason, talkingPoints, potentialObjections, personalDetails, specialistProfile, bestNextStep.

Formatting requirements:
- score must be an integer 0-100
- tier must be exactly one of: Hot, Warm, Cold
- urgency should be concise (for example: Immediate, This Month, Exploring)
- signals must be an array of objects: {{"text":"...", "type":"positive|neutral|negative"}}
- personalDetails must be a plain string paragraph (not an object)
- specialistProfile must be an object:
  {{"name":"...","title":"...","style":"...","strengths":["..."],"idealCustomers":["..."],"whyMatch":"..."}}
- bestNextStep must be an object:
  {{"title":"...","rationale":"...","priority":"Low|Medium|High","actions":["..."],"suggestedMessage":"..."}}
  - Make this practical and specific to this exact customer.
  - Include exactly 2-3 actions.
  - suggestedMessage should be one concise sentence the rep can say next.
"""
    return Task(
        description=description,
        expected_output="Valid JSON object only.",
        agent=lead_analyst,
    )


def create_initial_email_task(form_data: dict, assessment: dict) -> Task:
    description = f"""
Write a SHORT first-touch follow-up email for this customer.

Customer:
- Name: {form_data.get('name')}
- Context: {form_data.get('context')}
- Model: {assessment.get('recommendedModel')}
- Specialist: {assessment.get('assignedSpecialist')}
- Summary: {assessment.get('summary')}
- Talking points: {assessment.get('talkingPoints')}

Rules:
- Warm and personalized
- Mention 1-2 specific details from their context
- Tone: honest, no pressure
- Keep body under 130 words
- Keep subject under 9 words
- Do NOT include a signature line or sender name (system adds signature)
- This is FIRST CONTACT:
  - Do NOT imply a previous call/visit/text/chat
  - Do NOT use phrases like "great chatting again", "as discussed", "yesterday"
- Ask one simple next step at the end

Return ONLY valid JSON:
{{
  "subject": "...",
  "body": "plain text email body",
  "html": "html email body",
  "fromName": "<assigned specialist>"
}}
"""
    return Task(
        description=description,
        expected_output="Valid JSON object only.",
        agent=comms_specialist,
    )
