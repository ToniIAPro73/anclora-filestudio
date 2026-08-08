# Local Agent Flow

1. Talent starts pairing.
2. User approves six-digit pairing code with `filestudio:admin`.
3. Local Agent posts capabilities.
4. Talent creates jobs with `POST /api/v1/agent-jobs`.
5. Local Agent leases, downloads input with `X-Agent-Input-Token`, uploads result
   and confirms.
6. Talent reads public status through `/api/v1/jobs/:id` and downloads via result
   token.

Consent remains `ask-always` for Talent operations.
