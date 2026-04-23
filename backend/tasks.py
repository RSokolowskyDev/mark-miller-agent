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

VEHICLE RECOMMENDATION RULES:
- Never output "Not sure yet" as a recommendation.
  Always pick a specific model. If unsure between two,
  pick the more conservative match and note the alternative.
- Use trade-in make/model/year to infer size preference
  and lifestyle. A Ford Escape suggests compact SUV comfort
  zone. A minivan suggests maximum space priority.
- "Big family" without a number means Forester first,
  Ascent as an option to explore in person.
- Confidence score 1-2 = lead with simplicity and patience
  in all recommendations.
- Confidence score 4-5 = lead with efficiency, respect
  their research, don't over-explain.
- Follow-up preference "call" = direct and decisive person,
  approach accordingly.
- Follow-up preference "email" = analytical, needs time,
  send information not pressure.
- Follow-up preference "text" = casual, keep all
  communication brief and friendly.
- Budget is a feeling. Note when budget and lifestyle
  signals are misaligned - a family of 5 with a $25k
  budget needs honest guidance, not just validation.

NEXT BEST STEP RULES:
Generate a nextBestStep object in your JSON output:
{{
  "nextBestStep": {{
    "action": "<one specific sentence - what to do,
                when, how, referencing something from
                their form>",
    "discoveryQuestions": [
      {{
        "question": "<question to ask the customer>",
        "rationale": "<one sentence: why this question
                       matters for THIS specific customer>"
      }}
    ]
  }}
}}

Discovery questions must go beyond the obvious.
Consider: what they didn't say, who else is involved,
life changes ahead, current vehicle frustrations,
whether they've visited other dealers, their actual
emotional state, whether budget is hard or soft,
what they already know from online research.
Generate 4-5 questions. Make them specific to this
customer - not generic questions you'd ask anyone.

Customer data:
Name: {form_data.get('name')}
Intent: {form_data.get('intent')}
Model interest: {form_data.get('model')}
Budget: {form_data.get('budget')}
Trade-in: {form_data.get('tradeIn', 'None')}
Payment: {form_data.get('paymentMethod')}
Timeline: {form_data.get('timeline')}
Confidence score (1-5): {form_data.get('confidence')}
Follow-up preference: {form_data.get('followUpPreference')}
First-time buyer: {form_data.get('firstTimeBuyer')}
Owned new vehicle before: {form_data.get('ownedNewVehicle')}
Shopping style: {form_data.get('purchaseStyle')}
Extra notes: {form_data.get('extraNotes')}
About them: {form_data.get('context')}

Return ONLY valid JSON with keys:
score, tier, urgency, signals, recommendedModel, assignedSpecialist,
summary, routingReason, talkingPoints, potentialObjections, personalDetails, specialistProfile, nextBestStep.

Formatting requirements:
- score must be an integer 0-100
- tier must be exactly one of: Hot, Warm, Cold
- urgency should be concise (for example: Immediate, This Month, Exploring)
- signals must be an array of objects: {{"text":"...", "type":"positive|neutral|negative"}}
- personalDetails must be a plain string paragraph (not an object)
- specialistProfile must be an object:
  {{"name":"...","title":"...","style":"...","strengths":["..."],"idealCustomers":["..."],"whyMatch":"..."}}
- nextBestStep must be an object:
  {{"action":"...","discoveryQuestions":[{{"question":"...","rationale":"..."}}]}}
  - action must be one specific sentence, not generic
  - discoveryQuestions must contain 4-5 question/rationale objects
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
