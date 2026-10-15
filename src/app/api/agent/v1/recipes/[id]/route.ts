import { agentJson, agentToday, handleAgentRequest } from "@/lib/agent-api-auth";
import { agentRecipeIdSchema, getAgentRecipe } from "@/lib/agent-recipe-service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleAgentRequest(request, async ({ userId, timeZone }) => {
    const parsed = agentRecipeIdSchema.safeParse((await params).id);
    if (!parsed.success) return agentJson({ error: "Invalid recipe ID" }, 400);
    const recipe = await getAgentRecipe(userId, parsed.data);
    if (!recipe) return agentJson({ error: "Recipe not found" }, 404);
    return agentJson({ recipe, today: agentToday(timeZone), timezone: timeZone });
  });
}
