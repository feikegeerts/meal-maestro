"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'flex justify-end' : ''}`}>
        <Card className={`p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <div className="whitespace-pre-wrap text-sm">{content}</div>
          {timestamp && (
            <div className={`text-xs mt-2 opacity-70 ${
              isUser ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}>
              {new Date(timestamp).toLocaleTimeString()}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}