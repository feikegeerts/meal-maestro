"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useIntelligentLoading } from "@/hooks/useIntelligentLoading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./chat-message";
import { ImageUploadButton } from "./image-upload-button";
import { ImagePreview } from "./image-preview";
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
import { useImageCompression } from "@/hooks/useImageCompression";
import { IMAGE_COMPRESSION_CONFIG } from "@/lib/image-compression-config";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  imageUrl?: string;
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

  // Image compression state and actions
  const {
    selectedImage,
    compressedImageData,
    isCompressing,
    error: imageError,
    handleImageSelect,
    clearImage,
    clearError,
  } = useImageCompression();
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use the intelligent loading hook
  const { loadingMessage, startIntelligentLoading, stopIntelligentLoading } =
    useIntelligentLoading({ t });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      messages.forEach((message) => {
        if (message.imageUrl && message.imageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(message.imageUrl);
        }
      });
    };
  }, [messages]);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight();
  };

  // Handle image errors from compression hook
  useEffect(() => {
    if (imageError) {
      setError(imageError);
    }
  }, [imageError]);

  // Handle image removal
  const handleImageRemove = useCallback(() => {
    clearImage();
    clearError();
    setError(null);
  }, [clearImage, clearError]);

  // Convert file to base64 for API
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));

      if (imageFile) {
        if (imageFile.size > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
          setError(IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE);
          return;
        }
        handleImageSelect(imageFile);
      }
    },
    [handleImageSelect]
  );

  // Handle paste events
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          if (file.size > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
            setError(IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE);
            return;
          }
          handleImageSelect(file);
        }
      }
    },
    [handleImageSelect]
  );

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage) || isLoading) return;

    const userMessage = inputMessage.trim();
    const imageToProcess = selectedImage;
    const compressedImageForApi = compressedImageData;
    setInputMessage("");
    clearImage();
    clearError();
    setError(null);
    setIsLoading(true);

    // Start intelligent loading sequence
    startIntelligentLoading(userMessage, !!imageToProcess);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Create image URL for display if we have an image
    let imageUrlForDisplay: string | undefined;
    if (imageToProcess) {
      imageUrlForDisplay = URL.createObjectURL(imageToProcess);
    }

    // Add user message to chat
    const newMessages = [
      ...messages,
      {
        role: "user" as const,
        content: userMessage, // This will be empty string if no text was provided
        timestamp: new Date().toISOString(),
        imageUrl: imageUrlForDisplay,
      },
    ];
    setMessages(newMessages);

    try {
      // Use compressed image data if available, otherwise convert original
      let imageData: string | undefined;
      if (imageToProcess) {
        if (compressedImageForApi) {
          imageData = compressedImageForApi;
        } else {
          // Fallback to original file if compression failed
          imageData = await fileToBase64(imageToProcess);
        }
      }

      const requestBody = {
        message: userMessage || (imageToProcess ? "" : ""),
        locale: locale,
        conversation_history: messages,
        ...(imageData && { images: [imageData] }),
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
      const messagesWithTimestamps = data.conversation_history.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString(),
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
      stopIntelligentLoading();
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
                  imageUrl={message.imageUrl}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {loadingMessage || t("thinking")}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <Separator />

            {/* Input Area */}
            <div
              className="p-4"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 mb-3 flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-destructive hover:text-destructive/80 ml-2"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {selectedImage && (
                <div className="mb-3">
                  <ImagePreview
                    file={selectedImage}
                    onRemove={handleImageRemove}
                    className="max-w-sm"
                  />
                </div>
              )}

              {/* Drag and drop overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10 mb-3">
                  <div className="text-primary font-medium">
                    Drop image here to analyze for recipes
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    onPaste={handlePaste}
                    placeholder={
                      selectedImage
                        ? "Add a message about this image (optional)"
                        : t("inputPlaceholder")
                    }
                    disabled={isLoading}
                    className="resize-none min-h-10 max-h-32 py-2"
                    rows={1}
                  />
                </div>
                <ImageUploadButton
                  onImageSelect={handleImageSelect}
                  disabled={isLoading}
                  variant="icon"
                />
                <Button
                  onClick={sendMessage}
                  disabled={
                    (!inputMessage.trim() && !selectedImage) ||
                    isLoading ||
                    isCompressing
                  }
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
