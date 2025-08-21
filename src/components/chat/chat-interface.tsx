"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./chat-message";
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Recipe } from "@/types/recipe";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/auth-context";

interface ChatMessage {
  role: "user" | "assistant";
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

export function ChatInterface({
  selectedRecipe,
  onRecipeGenerated,
  currentFormState,
  isDesktopSidebar = false,
}: ChatInterfaceProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: t("welcomeMessage"),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(isDesktopSidebar ? true : false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight();
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setError(null);
    setIsLoading(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message to chat
    const newMessages = [
      ...messages,
      {
        role: "user" as const,
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(newMessages);

    try {
      const requestBody = {
        message: userMessage,
        locale: locale,
        conversation_history: messages,
        context: {
          ...(currentFormState && { current_form_state: currentFormState }),
          ...(selectedRecipe && {
            selected_recipe: {
              id: selectedRecipe.id,
              title: selectedRecipe.title,
              category: selectedRecipe.category,
              season: selectedRecipe.season,
              cuisine: selectedRecipe.cuisine,
              diet_types: selectedRecipe.diet_types,
              cooking_methods: selectedRecipe.cooking_methods,
              dish_types: selectedRecipe.dish_types,
              proteins: selectedRecipe.proteins,
              occasions: selectedRecipe.occasions,
              characteristics: selectedRecipe.characteristics,
              ingredients: selectedRecipe.ingredients.map((ing) =>
                `${ing.amount || ""} ${ing.unit || ""} ${ing.name}`.trim()
              ),
              description: selectedRecipe.description,
            },
          }),
        },
      };

      const response = await fetch("/api/recipes/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      // Update messages with full conversation history from response
      // Ensure all messages have timestamps
      const messagesWithTimestamps = data.conversation_history.map((msg, index) => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString()
      }));
      setMessages(messagesWithTimestamps);

      // Check if AI updated the form (either through direct update or URL extraction)
      if (data.function_call && onRecipeGenerated) {
        if (data.function_call.function === "update_recipe_form") {
          const result = data.function_call.result as {
            formUpdate?: unknown;
            success?: boolean;
          };
          if (result?.formUpdate) {
            onRecipeGenerated(result.formUpdate);
          }
        } else if (data.function_call.function === "extract_recipe_from_url") {
          const result = data.function_call.result as {
            formUpdate?: unknown;
            success?: boolean;
            error?: string;
          };
          if (result?.formUpdate) {
            onRecipeGenerated(result.formUpdate);
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full shadow-lg gap-2">
      <CardHeader
        className={`${!isDesktopSidebar ? "cursor-pointer" : ""} pb-3`}
        onClick={() => !isDesktopSidebar && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle
            className={`flex items-center gap-2 ${
              isDesktopSidebar ? "text-base" : "text-lg"
            }`}
          >
            <MessageSquare
              className={`${isDesktopSidebar ? "h-4 w-4" : "h-5 w-5"}`}
            />
            {t("assistantTitle")}
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
            <div
              className={`overflow-y-auto p-4 space-y-4 ${
                isDesktopSidebar
                  ? "max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-250px)]"
                  : "max-h-96"
              }`}
            >
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  userProfile={message.role === "user" ? profile : undefined}
                  locale={locale}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("thinking")}</span>
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

              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={t("inputPlaceholder")}
                  disabled={isLoading}
                  className="flex-1 resize-none min-h-10 max-h-32 py-2"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
