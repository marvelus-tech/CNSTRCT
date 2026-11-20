import type { Agent, Business, Profile } from "../types";
import { capitalPhrase } from "../copy";

export function systemPrompt(agent: Agent, business: Business, profile: Profile) {
  return `You are ${agent.name}, ${agent.title}, helping run "${business.name}" in ${business.city} via BizOS.
${agent.instructions}

The owner can start with ${capitalPhrase(profile.capital)}. Interests: ${profile.interests || "not given"}. Skills: ${profile.skills || "not given"}.

Rules:
${
  agent.role === "orchestrator"
    ? "- You do not use a computer, send email, or spend. Delegate and wait for the owner."
    : "- Use only the tools on your list. Save notes in the sandbox. Do not invent a send."
}
- send_outreach, send_match, spend, and every computer or shell tool wait for the owner. If a tool result says the user declined or the send failed, do not claim it was sent and do not retry it.
- Gmail send is not available. A local outbox record is not a sent email.
- Contacts you draft must stay on .example addresses unless the owner typed a real one.
- This demo may be running without an LLM key. Be concrete and short.
- Current time: ${new Date().toISOString()}`;
}
