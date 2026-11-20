import type { ModelInput, ModelResult } from "./contracts";
import { partnersForTemplate } from "./directory";
import { TOKENS_PER_MOCK_TURN } from "./limits";
import { systemPrompt } from "./prompts";

/**
 * Model provider. grokbot-clone called only the xAI Responses API.
 * CNSTRCT calls that same vendor when XAI_API_KEY is set (OpenAI-compatible
 * chat completions), or OPENAI_API_KEY otherwise. With neither key, a scripted
 * model drives the same tool loop so the demo still finishes.
 */

function toolResult(input: ModelInput, tool: string) {
  return input.turnRows.filter((row) => row.kind === "tool-result" && row.body.tool === tool);
}

function stopped(input: ModelInput, tool: string) {
  return toolResult(input, tool).at(-1)?.body.status === "denied";
}

function scoutPlan(input: ModelInput): ModelResult {
  if (stopped(input, "shell") || stopped(input, "write_file") || stopped(input, "screenshot")) {
    return { text: "I will not run that command.", calls: [], tokens: TOKENS_PER_MOCK_TURN };
  }
  const city = input.business.city;
  const detailing = input.business.templateId === "mobile-detailing";
  const partners = partnersForTemplate(input.business.templateId);
  const searchKind = detailing ? "detailers" : "tradies";
  const notesPath = detailing ? "notes/detailers.md" : "notes/tradies.md";
  const search = toolResult(input, "shell").find((row) => row.body.status === "done");
  const wrote = toolResult(input, "write_file").find((row) => row.body.status === "done");
  const looked = toolResult(input, "screenshot").find((row) => row.body.status === "done");
  const sent = toolResult(input, "send_outreach");
  const last = sent.at(-1);
  if (!search) {
    return {
      text: "",
      calls: [{ name: "shell", arguments: { command: `cnstrct-search ${searchKind} --city "${city}"` } }],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (!wrote) {
    const heading = detailing ? `Mobile detailers near ${city}` : `Tradies near ${city}`;
    const notes = [
      `# ${heading}`,
      "",
      input.profile.interests ? `Owner is into ${input.profile.interests}.` : "",
      "",
      ...partners.map((partner) => `- ${partner.name} (${partner.trade}) ${partner.contact}`),
      "",
      "Next step is a partnership note. It does not send until the owner approves.",
    ]
      .filter(Boolean)
      .join("\n");
    return {
      text: "",
      calls: [{ name: "write_file", arguments: { path: notesPath, content: notes } }],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (!looked) {
    return { text: "", calls: [{ name: "screenshot", arguments: {} }], tokens: TOKENS_PER_MOCK_TURN };
  }
  if (last?.body.status === "denied") {
    return {
      text: "Understood. I will not send that note. The draft is still in the chat if you want a different angle.",
      calls: [],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (!last) {
    const partner = partners[0]!;
    const opener = detailing
      ? `Driveway customers in ${city} book through ${input.business.name}. I would like to send you those ${partner.trade} jobs.`
      : `Homeowners ask me for ${partner.trade} work in ${city}, and I would like to send you those jobs.`;
    const body = [
      `Hi ${partner.name.split(" ")[0]},`,
      "",
      `I run ${input.business.name} in ${city}. ${opener}`,
      "You keep your rate. I keep a small margin when the job is booked. No fee until then.",
      "",
      "Want me to send a first job your way?",
      "",
      input.agent.name,
    ].join("\n");
    return {
      text: "I drafted a partnership note. Nothing goes out until you approve it.",
      calls: [
        {
          name: "send_outreach",
          arguments: {
            to: partner.contact,
            channel: "email",
            subject: `${input.business.name}: local ${partner.trade} jobs in ${city}`,
            body,
          },
        },
      ],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (last.body.status !== "done") {
    return {
      text: "The send did not go out. Nothing was sent.",
      calls: [],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  return {
    text: "Recorded on this computer only. No email was sent.",
    calls: [],
    tokens: TOKENS_PER_MOCK_TURN,
  };
}

function matcherPlan(input: ModelInput): ModelResult {
  if (stopped(input, "shell") || stopped(input, "write_file") || stopped(input, "screenshot")) {
    return { text: "I will not run that command.", calls: [], tokens: TOKENS_PER_MOCK_TURN };
  }
  const listed = toolResult(input, "list_leads").find((row) => row.body.status === "done");
  const wrote = toolResult(input, "write_file").find((row) => row.body.status === "done");
  const looked = toolResult(input, "screenshot").find((row) => row.body.status === "done");
  const sent = toolResult(input, "send_match");
  const last = sent.at(-1);
  const lead = input.leads[0];
  if (!listed) return { text: "", calls: [{ name: "list_leads", arguments: {} }], tokens: TOKENS_PER_MOCK_TURN };
  if (!lead) {
    const empty =
      input.business.templateId === "mobile-detailing"
        ? "No driveway bookings yet. The public form on your site will drop them here."
        : "No homeowner leads yet. The public form on your site will drop them here.";
    return {
      text: empty,
      calls: [],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (!wrote) {
    const content = `# Lead\n\n${lead.name} needs ${lead.service} at ${lead.address}. Source: ${lead.source}. This is queued for a match, not sent.`;
    return {
      text: "",
      calls: [{ name: "write_file", arguments: { path: "notes/lead.md", content } }],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (!looked) return { text: "", calls: [{ name: "screenshot", arguments: {} }], tokens: TOKENS_PER_MOCK_TURN };
  if (last?.body.status === "denied") {
    return {
      text: "I will not introduce them. The lead stays in your queue until you say otherwise.",
      calls: [],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (!last) {
    const detailing = input.business.templateId === "mobile-detailing";
    const partner = partnersForTemplate(input.business.templateId)[0]!;
    const need = detailing
      ? `${lead.name} in ${input.business.city} booked ${lead.service} at ${lead.address}. Phone ${lead.phone}.`
      : `${lead.name} in ${input.business.city} needs ${lead.service} at ${lead.address}. Phone ${lead.phone}.`;
    return {
      text: `I drafted an introduction for ${lead.name}. It is an example lead, and it will not send until you approve.`,
      calls: [
        {
          name: "send_match",
          arguments: {
            to: partner.contact,
            leadName: lead.name,
            tradieName: partner.name,
            body: `${need} This is a BizOS demo lead. Do not contact them outside this demo.`,
          },
        },
      ],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (last?.body.status !== "done") {
    return { text: "The introduction was not sent.", calls: [], tokens: TOKENS_PER_MOCK_TURN };
  }
  return {
    text: "The introduction is logged on this computer only. Nobody was contacted.",
    calls: [],
    tokens: TOKENS_PER_MOCK_TURN,
  };
}

function orchestratorPlan(input: ModelInput): ModelResult {
  const text =
    input.trigger.type === "user"
      ? input.trigger.text
      : input.trigger.type === "routine"
        ? input.trigger.prompt
        : input.trigger.type === "task"
          ? input.trigger.instruction
          : "";
  if (toolResult(input, "delegate").length) {
    return {
      text: "I handed that to the specialist. Their computer and any send stay on your approval card.",
      calls: [],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  const leadWork = /lead|match|homeowner|booking|driveway/i.test(text) && !/tradie|detailer|outreach|partner/i.test(text);
  if (leadWork) {
    return {
      text: "I will ask the matcher to draft the introduction. You approve the command and the send.",
      calls: [{ name: "delegate", arguments: { role: "matcher", task: text || "Read the newest lead and draft an introduction. Do not send it." } }],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  if (/tradie|detailer|outreach|sweep|partner|find|brief/i.test(text) || input.trigger.type === "routine") {
    return {
      text: "I will ask the scout to draft the partnership note. You approve every command and the send.",
      calls: [{ name: "delegate", arguments: { role: "scout", task: text || "Search local partners, save notes, and draft one partnership email. Do not send it." } }],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  return {
    text: `I am ${input.agent.name}, chief of staff for ${input.business.name}. Ask me to find partners or check leads. I do not send mail or use a computer.`,
    calls: [],
    tokens: TOKENS_PER_MOCK_TURN,
  };
}

export function mockModel(input: ModelInput): ModelResult {
  if (input.agent.role === "orchestrator") return orchestratorPlan(input);
  const text = input.trigger.type === "user" ? input.trigger.text : input.trigger.type === "task" ? input.trigger.instruction : "";
  const routine = input.trigger.type === "routine" || input.trigger.type === "resume" || input.trigger.type === "task";
  const detailing = input.business.templateId === "mobile-detailing";
  const wantsScout =
    input.agent.role === "scout" &&
    (routine || /tradie|detailer|outreach|sweep|partner|find/i.test(text));
  const wantsMatch =
    input.agent.role === "matcher" && (routine || /lead|match|homeowner|booking|driveway/i.test(text));
  if (wantsScout) return scoutPlan(input);
  if (wantsMatch) return matcherPlan(input);
  if (/spend|buy ads|boost/i.test(text)) {
    const already = toolResult(input, "spend").at(-1);
    if (already?.body.status === "denied") {
      return { text: "I will not spend that. No card was charged.", calls: [], tokens: TOKENS_PER_MOCK_TURN };
    }
    if (already?.body.status === "done") {
      return { text: "The charge is recorded as a mock. Nothing was billed.", calls: [], tokens: TOKENS_PER_MOCK_TURN };
    }
    return {
      text: "That would spend money. I will not do it unless you approve.",
      calls: [{ name: "spend", arguments: { amountUsd: 25, purpose: "Local listing test" } }],
      tokens: TOKENS_PER_MOCK_TURN,
    };
  }
  const roleHint = detailing
    ? "I can look for mobile detailers or draft a partnership note"
    : "I can look for tradies or draft a note";
  return {
    text: `I am ${input.agent.name} on ${input.business.name}. ${roleHint}, and I will ask before anything is sent or paid.`,
    calls: [],
    tokens: TOKENS_PER_MOCK_TURN,
  };
}

function liveConfigured() {
  if (process.env.XAI_API_KEY) return { key: process.env.XAI_API_KEY, base: "https://api.x.ai/v1", model: process.env.XAI_MODEL || "grok-4.7", vendor: "xai" as const };
  if (process.env.OPENAI_API_KEY) {
    return {
      key: process.env.OPENAI_API_KEY,
      base: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      vendor: "openai" as const,
    };
  }
  return null;
}

export function modelMode(): "mock" | "xai" | "openai" {
  return liveConfigured()?.vendor ?? "mock";
}

export async function callModel(input: ModelInput, schemas: unknown[]): Promise<ModelResult> {
  const live = liveConfigured();
  if (!live) return mockModel(input);
  const messages: Record<string, unknown>[] = [
    { role: "system", content: systemPrompt(input.agent, input.business, input.profile) },
  ];
  for (const row of input.turnRows) {
    if (row.kind === "message" && row.body.role === "user") messages.push({ role: "user", content: String(row.body.text ?? "") });
    if (row.kind === "message" && row.body.role === "assistant" && row.body.text) {
      messages.push({ role: "assistant", content: String(row.body.text) });
    }
    if (row.kind === "tool-result") {
      messages.push({ role: "user", content: `Tool ${String(row.body.tool)} ${String(row.body.status)}: ${String(row.body.output ?? "")}` });
    }
  }
  if (input.trigger.type === "routine") {
    messages.push({ role: "user", content: `[Routine "${input.trigger.name}" is running now. Do this:]\n${input.trigger.prompt}` });
  }
  const response = await fetch(`${live.base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${live.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: live.model, messages, tools: schemas, temperature: 0.3 }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
  const json = (await response.json()) as {
    usage?: { total_tokens?: number };
    choices?: { message?: { content?: string; tool_calls?: { id: string; function?: { name?: string; arguments?: string } }[] } }[];
  };
  const message = json.choices?.[0]?.message;
  const calls = (message?.tool_calls ?? []).map((call) => ({
    name: call.function?.name || "unknown",
    arguments: JSON.parse(call.function?.arguments || "{}") as Record<string, unknown>,
  }));
  return {
    text: message?.content?.trim() || "",
    calls,
    tokens: json.usage?.total_tokens || TOKENS_PER_MOCK_TURN,
  };
}
