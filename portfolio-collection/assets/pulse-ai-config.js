/* Pulse AI service address — that is where the audit engine and the assistant run.
   The service is hosted separately from this static build (Render web service
   "pulse-ai-audit", repo lareesahu/pulse-ai); this file is the only place the
   address lives, and every page loads it. The address moved on 2026-10-01: the
   first service's Render workspace ran out of free instance hours, which suspends
   every free web service in that workspace, so the same code was deployed to the
   workspace that is still inside its hours. It answers only to the origins listed in the
   service's PULSE_ALLOWED_ORIGINS. Set it to "" if the service is ever served
   from the same host as the site. */
window.PULSE_AI = { service: "https://pulse-ai-audit.onrender.com", audit: "/api/audit", scoping: "/api/scoping", assistant: "/api/assistant", lead: "/api/lead", event: "/api/event", health: "/api/health" };
