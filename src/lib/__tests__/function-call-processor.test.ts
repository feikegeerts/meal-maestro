import type { OpenAI } from 'openai';
import { FunctionCallProcessor } from '../function-call-processor';
import { updateRecipeForm, extractRecipeFromUrl } from '../recipe-functions';
import { createChatCompletion } from '../openai-service';

jest.mock('../recipe-functions', () => ({
  updateRecipeForm: jest.fn(),
  extractRecipeFromUrl: jest.fn(),
  createRecipeFormFunction: jest.fn(() => ({
    type: 'function',
    function: {
      name: 'update_recipe_form',
      description: 'update recipe',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  })),
  extractRecipeFromUrlFunction: {
    type: 'function',
    function: {
      name: 'extract_recipe_from_url',
      description: 'extract recipe',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
}));

jest.mock('../openai-service', () => ({
  createChatCompletion: jest.fn(),
}));

jest.mock('../chat-prompts', () => ({
  getAIProcessingPrompt: jest.fn(() => 'process prompt'),
  getRecipeRecoveryPrompt: jest.fn(() => 'recovery prompt'),
}));

const mockedUpdateRecipeForm = updateRecipeForm as jest.MockedFunction<typeof updateRecipeForm>;
const mockedExtractRecipeFromUrl = extractRecipeFromUrl as jest.MockedFunction<typeof extractRecipeFromUrl>;
const mockedCreateChatCompletion = createChatCompletion as jest.MockedFunction<typeof createChatCompletion>;

describe('FunctionCallProcessor.processFunctionCall', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockImplementation(() => undefined);
  });

  const buildToolCall = (name: string, args: Record<string, unknown>) =>
    ({
      id: 'tool-call-id',
      type: 'function',
      function: {
        name,
        arguments: JSON.stringify(args),
      },
    } as unknown as OpenAI.Chat.Completions.ChatCompletionMessageToolCall);

  it('handles update_recipe_form success with generated response copy', async () => {
    mockedUpdateRecipeForm.mockResolvedValueOnce({
      formUpdate: { title: 'Pasta' },
      success: true,
    });

    const processor = new FunctionCallProcessor('en');
    const toolCall = buildToolCall('update_recipe_form', { title: 'Pasta' });

    const result = await processor.processFunctionCall(toolCall, [], null);

    expect(mockedUpdateRecipeForm).toHaveBeenCalledWith({ title: 'Pasta' });
    expect(result.functionResult).toEqual({
      function: 'update_recipe_form',
      result: { formUpdate: { title: 'Pasta' }, success: true },
    });
    expect(result.responseContent).toContain("I've created the Pasta recipe");
  });

  it('returns original response content when provided', async () => {
    mockedUpdateRecipeForm.mockResolvedValueOnce({
      formUpdate: { title: 'Soup' },
      success: true,
    });

    const processor = new FunctionCallProcessor('en');
    const toolCall = buildToolCall('update_recipe_form', { title: 'Soup' });

    const result = await processor.processFunctionCall(
      toolCall,
      [],
      'Original assistant response'
    );

    expect(result.responseContent).toBe('Original assistant response');
  });

  it('captures update_recipe_form errors', async () => {
    mockedUpdateRecipeForm.mockRejectedValueOnce(new Error('boom'));

    const processor = new FunctionCallProcessor('en');
    const toolCall = buildToolCall('update_recipe_form', { title: 'Fail' });

    const result = await processor.processFunctionCall(toolCall, [], null);

    expect(result.functionResult).toEqual({
      function: 'update_recipe_form',
      error: 'boom',
    });
    expect(result.responseContent).toBe('There was an error processing the recipe.');
  });

  it('processes extract_recipe_from_url success flow and invokes usage guard', async () => {
    mockedExtractRecipeFromUrl.mockResolvedValueOnce({
      success: true,
      formUpdate: {
        title: 'Scraped Title',
      },
    });
    mockedUpdateRecipeForm.mockResolvedValueOnce({
      formUpdate: { title: 'Normalized Title' },
      success: true,
    });
    mockedCreateChatCompletion.mockResolvedValueOnce({
      completion: {
        choices: [
          {
            message: {
              content: 'AI response',
              tool_calls: [
                {
                  id: 'tool-1',
                  type: 'function',
                  function: {
                    name: 'update_recipe_form',
                    arguments: JSON.stringify({ title: 'Normalized Title' }),
                  },
                },
              ],
            },
          },
        ],
      },
    } as unknown as Awaited<ReturnType<typeof createChatCompletion>>);

    const usageGuard = jest.fn().mockResolvedValue(undefined);
    const processor = new FunctionCallProcessor('en', 'mixed', ['Jar'], usageGuard);
    const toolCall = buildToolCall('extract_recipe_from_url', { url: 'https://example.com' });

    const result = await processor.processFunctionCall(toolCall, [], null);

    expect(mockedExtractRecipeFromUrl).toHaveBeenCalledWith({ url: 'https://example.com' });
    expect(usageGuard).toHaveBeenCalledTimes(1);
    expect(mockedCreateChatCompletion).toHaveBeenCalled();
    expect(mockedUpdateRecipeForm).toHaveBeenCalledWith({ title: 'Normalized Title' });
    expect(result.functionResult).toEqual({
      function: 'update_recipe_form',
      result: {
        formUpdate: { title: 'Normalized Title' },
        success: true,
      },
    });
    expect(result.responseContent).toBe('AI response');
  });

  it('returns extract_recipe_from_url error when pipeline throws', async () => {
    mockedExtractRecipeFromUrl.mockRejectedValueOnce(new Error('network failure'));

    const processor = new FunctionCallProcessor('en');
    const toolCall = buildToolCall('extract_recipe_from_url', { url: 'bad://example' });

    const result = await processor.processFunctionCall(toolCall, [], null);

    expect(result.functionResult).toEqual({
      function: 'extract_recipe_from_url',
      error: 'network failure',
    });
    expect(result.responseContent).toBeNull();
  });
});
