# Mark Miller Subaru - AI Lead Intelligence System

AI-powered lead scoring and follow-up email system built to demonstrate how AI agents can integrate with dealership operations.

Built with CrewAI (two-agent pipeline), FastAPI, React, Groq, and Gmail.

## Live URLs
- Customer Form: https://rsokolowskydev.github.io/mark-miller-agent/customer-form/
- Dashboard: https://rsokolowskydev.github.io/mark-miller-agent/dashboard/

## How it works
1. Customer fills out the form.
2. CrewAI pipeline runs: Lead Analyst scores inquiry and Comms Specialist writes personalized email.
3. Lead appears in dashboard in near real time.
4. Product Specialist reviews lead brief with talking points and objection handlers.
5. Specialist marks lead as converted.
6. Post-sale email sequence triggers automatically (30-second interval for demo).

## The two agents
- Lead Analyst: scores and tiers inquiries, assigns specialist, generates talking points and objection handlers.
- Communications Specialist: writes human-sounding personalized emails for customer follow-up.

## Running locally

### Prerequisites
- Python 3.10-3.12
- Node.js 18+
- Groq API key
- Gmail account with App Password configured

### Setup
Terminal 1 - Backend:
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in GROQ_API_KEY and GMAIL_APP_PASSWORD in .env
uvicorn main:app --reload --port 8000
```

Terminal 2 - Customer Form:
```bash
cd customer-form
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Terminal 3 - Dashboard:
```bash
cd dashboard
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### For live demo with GitHub Pages
1. Start ngrok: `ngrok http 8000`
2. Copy the HTTPS URL.
3. In `customer-form`, set `.env.production` to `VITE_API_URL=https://xxx.ngrok.io`.
4. In `dashboard`, set `.env.production` to `VITE_API_URL=https://xxx.ngrok.io`.
5. Deploy customer form: `cd customer-form && npm run deploy`.
6. Deploy dashboard: `cd dashboard && npm run deploy`.

## Notes
- Set `GROQ_API_KEY` in backend `.env` (or in your cloud host env vars).
- Gmail App Password is required (do not use your normal Gmail password).
- `.env` files are gitignored and should never be committed.
