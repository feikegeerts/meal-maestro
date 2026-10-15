import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

export interface AgentIdentity {
  userId: string;
  timeZone: string;
}

export function agentJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Authorization" },
  });
}

/** A separate credential: never grants access to browser, admin, or AI routes. */
export function authenticateAgent(request: Request): AgentIdentity | Response {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43,256})$/i);
  if (!match) return unauthorized();

  const expectedHash = process.env.MEAL_MAESTRO_AGENT_TOKEN_SHA256;
  const userId = process.env.MEAL_MAESTRO_AGENT_USER_ID;
  const timeZone = process.env.MEAL_MAESTRO_AGENT_TIMEZONE || "Europe/Amsterdam";
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash) || !z.uuid().safeParse(userId).success) {
    return agentJson({ error: "Agent API is not configured" }, 503);
  }

  const suppliedHash = createHash("sha256").update(match[1]).digest();
  if (!timingSafeEqual(suppliedHash, Buffer.from(expectedHash, "hex"))) {
    return unauthorized();
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    return agentJson({ error: "Agent API is not configured" }, 503);
  }
  return { userId: userId!, timeZone };
}

function unauthorized() {
  const response = agentJson({ error: "Invalid or missing API token" }, 401);
  response.headers.set("WWW-Authenticate", 'Bearer realm="meal-maestro-agent"');
  return response;
}

export function agentToday(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function handleAgentRequest(
  request: Request,
  handler: (identity: AgentIdentity) => Promise<Response>,
): Promise<Response> {
  const identity = authenticateAgent(request);
  if (identity instanceof Response) return identity;
  try {
    return await handler(identity);
  } catch {
    // Do not log request headers, recipe contents, or credentials.
    console.error("Agent API request failed");
    return agentJson({ error: "Internal server error" }, 500);
  }
}
