"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./chat-message";
import { Send, Loader2, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { useTranslations } from 'next-intl';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface FunctionCall {
  function: string;
  result?: unknown;
  error?: string;
}

interface ChatResponse {
  response: string;
  conversation_history: ChatMessage[];
  function_call?: FunctionCall;
}

interface ChatInterfaceProps {
  selectedRecipe?: Recipe;
  onRecipeGenerated?: (recipeData: unknown) => void;
  currentFormState?: {
    title?: string;
    ingredients?: Array<{
      id: string;
      name: string;
      amount?: number | null;
      unit?: string | null;
      notes?: string;
    }>;
    servings?: number;
    description?: string;
    category?: string;
    tags?: string[];
    season?: string;
  };
  isDesktopSidebar?: boolean;
}

export function ChatInterface({ selectedRecipe, onRecipeGenerated, currentFormState, isDesktopSidebar = false }: ChatInterfaceProps) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: t('welcomeMessage'),
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(isDesktopSidebar ? true : false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive - disabled on desktop
  useEffect(() => {
    if (!isDesktopSidebar && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isDesktopSidebar]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);
    setIsLoading(true);

    // Add user message to chat
    const newMessages = [...messages, {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date().toISOString()
    }];
    setMessages(newMessages);

    try {
      const requestBody = {
        message: userMessage,
        conversation_history: messages,
        context: {
          ...(currentFormState && { current_form_state: currentFormState }),
          ...(selectedRecipe && {
            selected_recipe: {
              id: selectedRecipe.id,
              title: selectedRecipe.title,
              category: selectedRecipe.category,
              season: selectedRecipe.season,
              tags: selectedRecipe.tags,
              ingredients: selectedRecipe.ingredients.map(ing => 
                `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()
              ),
              description: selectedRecipe.description
            }
          })
        }
      };

      const response = await fetch('/api/recipes/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      // Update messages with full conversation history from response
      setMessages(data.conversation_history);

      // Check if AI updated the form
      if (data.function_call && data.function_call.function === 'update_recipe_form' && onRecipeGenerated) {
        const result = data.function_call.result as { formUpdate?: unknown; success?: boolean };
        if (result?.formUpdate) {
          onRecipeGenerated(result.formUpdate);
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader 
        className={`${!isDesktopSidebar ? 'cursor-pointer' : ''} pb-3`}
        onClick={() => !isDesktopSidebar && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${isDesktopSidebar ? 'text-base' : 'text-lg'}`}>
            <MessageSquare className={`${isDesktopSidebar ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {t('assistantTitle')}
          </CardTitle>
          {!isDesktopSidebar && (
            <Button variant="ghost" size="sm">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <>
          <Separator />
          <CardContent className="p-0">
            {/* Chat Messages */}
            <div className={`overflow-y-auto p-4 space-y-4 ${
              isDesktopSidebar 
                ? 'max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-250px)]' 
                : 'max-h-96'
            }`}>
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('thinking')}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <Separator />

            {/* Input Area */}
            <div className="p-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 mb-3">
                  {error}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('inputPlaceholder')}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {selectedRecipe && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                  {t('currentlyViewing')}: <span className="font-medium">{selectedRecipe.title}</span>
                </div>
              )}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}