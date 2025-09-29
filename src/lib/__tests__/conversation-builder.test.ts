import type { OpenAI } from 'openai';
import { ConversationBuilder, type ChatContext, type ChatMessage } from '../conversation-builder';

describe('ConversationBuilder.buildMessages', () => {
  it('includes unit preference and truncated custom units in system prompt', () => {
    const customUnits = Array.from({ length: 30 }, (_, index) => `Unit${index}`);
    const builder = new ConversationBuilder('en', 'precise-metric', customUnits);

    const messages = builder.buildMessages('Please help with a recipe');

    expect(messages[0].role).toBe('system');
    const systemContent = messages[0].content as string;
    expect(systemContent).toContain('User requires precise metric units only');
    expect(systemContent).toContain('Unit0');
    expect(systemContent).toContain('Unit24');
    expect(systemContent).not.toContain('Unit25');
    expect(systemContent).toContain('CRITICAL INSTRUCTION:');
  });

  it('adds form state and selected recipe context while skipping default values', () => {
    const builder = new ConversationBuilder('en');
    const context: ChatContext = {
      current_form_state: {
        title: 'Chocolate Cake',
        category: 'main-course',
        servings: 4,
        ingredients: [
          { id: '1', name: 'Flour', amount: 200, unit: 'g' },
          { id: '2', name: 'Sugar', amount: 150, unit: 'g' },
        ],
        description:
          'Preheat oven to 180°C. Mix ingredients thoroughly until smooth and bake for 35 minutes.',
        tags: ['dessert'],
        season: 'year-round',
      },
      selected_recipe: {
        id: 'recipe-123',
        title: 'Brownies',
        category: 'dessert',
        tags: ['sweet'],
        ingredients: ['Chocolate', 'Butter'],
        description: 'Rich brownies',
      },
    };

    const messages = builder.buildMessages('Show me context', [], context);

    const formContextMessage = messages.find(
      (msg) => msg.role === 'system' && typeof msg.content === 'string' && msg.content.startsWith('Current form state:')
    );

    expect(formContextMessage).toBeDefined();
    expect(formContextMessage?.content).toContain('Title: "Chocolate Cake"');
    expect(formContextMessage?.content).toContain('Ingredients: 200 g Flour, 150 g Sugar');
    expect(formContextMessage?.content).toContain('Tags: dessert');
    // Defaults should be omitted
    expect(formContextMessage?.content).not.toContain('Category: main-course');
    expect(formContextMessage?.content).not.toContain('Servings: 4');
    expect(formContextMessage?.content).not.toContain('Season: year-round');

    const recipeContextMessage = messages.find(
      (msg) =>
        msg.role === 'system' &&
        typeof msg.content === 'string' &&
        msg.content.startsWith('The user is currently looking at the recipe:')
    );

    expect(recipeContextMessage?.content).toContain('"Brownies" (dessert)');
  });

  it('appends conversation history and builds multimodal user message when images provided', () => {
    const builder = new ConversationBuilder('en');
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'How can I help?' },
      { role: 'user', content: 'Suggest a recipe' },
    ];

    const messages = builder.buildMessages('Here is an inspiration photo', history, undefined, [
      'https://example.com/image-one.png',
    ]);

    expect(messages[1]).toEqual({ role: 'assistant', content: 'How can I help?' });
    expect(messages[2]).toEqual({ role: 'user', content: 'Suggest a recipe' });

    const userMessage = messages[messages.length - 1];
    expect(userMessage.role).toBe('user');
    expect(Array.isArray(userMessage.content)).toBe(true);

    const contentParts = userMessage.content as OpenAI.Chat.Completions.ChatCompletionContentPart[];
    expect(contentParts[0]).toEqual({ type: 'text', text: 'Here is an inspiration photo' });
    expect(contentParts[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'https://example.com/image-one.png', detail: 'auto' },
    });
  });
});
