import { agentJson, agentToday, handleAgentRequest } from "@/lib/agent-api-auth";
import { agentRecipeQuerySchema, listAgentRecipes } from "@/lib/agent-recipe-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleAgentRequest(request, async ({ userId, timeZone }) => {
    const parsed = agentRecipeQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return agentJson({ error: "Invalid query parameters", details: parsed.error.issues }, 400);
    const result = await listAgentRecipes(userId, parsed.data);
    return agentJson({ ...result, today: agentToday(timeZone), timezone: timeZone });
  });
}
