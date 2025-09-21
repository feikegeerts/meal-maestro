"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiChatDemoProps {
  className?: string;
}

const chatFlows = {
  "find pasta recipes": [
    "I found 3 pasta recipes in your collection:",
    "• **Classic Pasta Carbonara** - Creamy Roman pasta with eggs and pancetta (25 min)",
    "• **Spaghetti Aglio e Olio** - Simple garlic and olive oil pasta (15 min)",
    "• **Penne Arrabbiata** - Spicy tomato pasta (20 min)",
    "",
    "Would you like me to show you one of these recipes?"
  ],
  "scale recipe for 6": [
    "I&apos;ll scale your Classic Pasta Carbonara recipe from 4 to 6 servings:",
    "",
    "**Updated ingredients:**",
    "• Spaghetti: 600g (was 400g)",
    "• Pancetta: 225g (was 150g)",
    "• Eggs: 5 (was 3)",
    "• Parmesan: 150g (was 100g)",
    "",
    "All other instructions remain the same. Cooking time stays around 25 minutes."
  ],
  "suggest dinner tonight": [
    "Based on your preferences and available time, here are my suggestions:",
    "",
    "**Quick options (under 30 min):**",
    "• Pasta Carbonara - comfort food, ingredients on hand",
    "• Mediterranean Quinoa Salad - healthy, no cooking required",
    "",
    "**If you have more time:**",
    "• Thai Green Curry - aromatic and satisfying",
    "",
    "What sounds good to you?"
  ],
  "convert to metric": [
    "I&apos;ve converted your Chocolate Chip Cookies recipe to metric:",
    "",
    "• 2 cups flour → **300g flour**",
    "• 1 cup butter → **200g butter**",
    "• 3/4 cup brown sugar → **150g brown sugar**",
    "• 2 eggs → **2 eggs** (no change)",
    "• 1 cup chocolate chips → **200g chocolate chips**",
    "",
    "Temperature: 350°F → **180°C**"
  ],
  "meal plan": [
    "Here&apos;s a 3-day meal plan using your saved recipes:",
    "",
    "**Monday:**",
    "• Lunch: Mediterranean Quinoa Salad",
    "• Dinner: Classic Pasta Carbonara",
    "",
    "**Tuesday:**",
    "• Lunch: Leftover quinoa salad",
    "• Dinner: Thai Green Curry",
    "",
    "**Wednesday:**",
    "• Lunch: Quick pasta with leftover curry sauce",
    "• Dinner: Order takeout or try something new!",
    "",
    "Should I add these to your calendar?"
  ]
};

const quickPrompts = [
  "find pasta recipes",
  "scale recipe for 6",
  "suggest dinner tonight",
  "convert to metric",
  "meal plan"
];

export function AiChatDemo({ className }: AiChatDemoProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initial greeting
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hi! I&apos;m your AI cooking assistant. I can help you find recipes, scale ingredients, suggest meals, and more. What would you like to do?",
      timestamp: new Date()
    }]);
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    // Find matching response or use generic response
    const lowerContent = content.toLowerCase();
    let response = "I understand you&apos;re asking about cooking! While this is just a demo, the real AI assistant can help with recipe management, meal planning, ingredient scaling, and cooking advice.";

    for (const [key, flow] of Object.entries(chatFlows)) {
      if (lowerContent.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerContent)) {
        response = flow.join('\n');
        break;
      }
    }

    setIsTyping(false);

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "flex max-w-[85%] space-x-2",
                message.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {message.role === 'user' ? (
                  <User className="h-3 w-3" />
                ) : (
                  <Bot className="h-3 w-3" />
                )}
              </div>

              <div
                className={cn(
                  "px-3 py-2 rounded-lg text-sm whitespace-pre-line",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground ml-2"
                    : "bg-muted text-foreground mr-2"
                )}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-2 max-w-[85%]">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                <Bot className="h-3 w-3" />
              </div>
              <div className="px-3 py-2 rounded-lg bg-muted text-foreground mr-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="text-xs text-muted-foreground mb-2">Try asking:</div>
          <div className="flex flex-wrap gap-1">
            {quickPrompts.slice(0, 3).map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/20">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about recipes, scaling, meal planning..."
            className="flex-1 h-9"
            disabled={isTyping}
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 w-9 p-0"
            disabled={!inputValue.trim() || isTyping}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}