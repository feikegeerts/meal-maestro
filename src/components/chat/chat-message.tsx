"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot, User } from "lucide-react";
import { UserProfile } from "@/lib/profile-service";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  userProfile?: UserProfile | null;
  locale?: string;
}

export function ChatMessage({ role, content, timestamp, userProfile, locale }: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        {isUser && userProfile?.avatar_url && (
          <AvatarImage
            src={userProfile.avatar_url}
            alt={userProfile.display_name || "User"}
          />
        )}
        <AvatarFallback>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'flex justify-end' : ''}`}>
        <Card className={`p-3 gap-1 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <div className="whitespace-pre-wrap text-sm">{content}</div>
          <div className={`text-xs mt-1 text-right ${
            isUser 
              ? 'text-primary-foreground/70' 
              : 'text-muted-foreground/70'
          }`}>
            {timestamp 
              ? new Date(timestamp).toLocaleTimeString(locale || 'en', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : 'Now'
            }
          </div>
        </Card>
      </div>
    </div>
  );
}