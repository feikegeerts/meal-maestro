import { agentJson, agentToday, handleAgentRequest } from "@/lib/agent-api-auth";
import { agentEatenBodySchema, agentRecipeIdSchema, markAgentRecipeEaten } from "@/lib/agent-recipe-service";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleAgentRequest(request, async ({ userId, timeZone }) => {
    const id = agentRecipeIdSchema.safeParse((await params).id);
    if (!id.success) return agentJson({ error: "Invalid recipe ID" }, 400);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return agentJson({ error: "A JSON object is required (use {} for today)" }, 400);
    }
    const parsed = agentEatenBodySchema.safeParse(body);
    if (!parsed.success) return agentJson({ error: "Expected only an optional date (YYYY-MM-DD)" }, 400);
    const today = agentToday(timeZone);
    const date = parsed.data.date ?? today;
    if (date > today) return agentJson({ error: "Eaten date cannot be in the future" }, 400);
    const recipe = await markAgentRecipeEaten(userId, id.data, date);
    if (!recipe) return agentJson({ error: "Recipe not found" }, 404);
    return agentJson({ success: true, recipe, date, today, timezone: timeZone });
  });
}
