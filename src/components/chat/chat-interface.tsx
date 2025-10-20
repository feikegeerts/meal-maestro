"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useIntelligentLoading } from "@/hooks/use-intelligent-loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UnitPreferenceSetting } from "@/components/settings/unit-preference-setting";
import { ChatMessage } from "./chat-message";
import { ImageUploadButton } from "./image-upload-button";
import { ImagePreview } from "./image-preview";
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Settings,
  RotateCcw,
} from "lucide-react";
import { Recipe } from "@/types/recipe";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useImageCompression } from "@/hooks/use-image-compression";
import { IMAGE_COMPRESSION_CONFIG } from "@/lib/image-compression-config";
import type { ConversationStore } from "@/lib/conversation-store";

const __lintTestFlag = true;

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

interface RequestContext {
  current_form_state?: {
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
  selected_recipe?: {
    id: string;
    title: string;
    category: string;
    season?: string;
    cuisine?: string;
    diet_types?: string[];
    cooking_methods?: string[];
    dish_types?: string[];
    proteins?: string[];
    occasions?: string[];
    characteristics?: string[];
    ingredients: string[];
    description: string;
  };
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
  enableManualReset?: boolean;
  conversationId?: string;
  conversationStore?: ConversationStore;
  onConversationStateChange?: (state: {
    messages: ChatMessage[];
    input: string;
    isExpanded: boolean;
  }) => void;
  greetingContext?: string;
}

export function ChatInterface({
  selectedRecipe,
  onRecipeGenerated,
  currentFormState,
  isDesktopSidebar = false,
  enableManualReset = false,
  conversationId,
  conversationStore,
  onConversationStateChange,
  greetingContext,
}: ChatInterfaceProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [retryData, setRetryData] = useState<{
    message: string;
    imageFile: File | null;
    compressedImageData: string | null;
    context: RequestContext;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

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
  const previousStoreRef = useRef<ConversationStore | undefined>(undefined);
  const previousConversationIdRef = useRef<string | undefined>(undefined);
  const metadataRef = useRef<Record<string, unknown>>({});

  // Use the intelligent loading hook
  const { loadingMessage, startIntelligentLoading, stopIntelligentLoading } =
    useIntelligentLoading({ t });

  const defaultAssistantMessage = useMemo(
    () => t("welcomeMessage"),
    [t]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !conversationStore) return;
    if (
      previousStoreRef.current !== conversationStore ||
      previousConversationIdRef.current !== conversationId
    ) {
      setHasInitialized(false);
      previousStoreRef.current = conversationStore;
      previousConversationIdRef.current = conversationId;
      metadataRef.current = {};
    }
  }, [conversationId, conversationStore]);

  useEffect(() => {
    if (hasInitialized) return;

    if (conversationId && conversationStore) {
      const stored = conversationStore.load(conversationId);
      if (stored && stored.messages?.length) {
        metadataRef.current = stored.metadata ?? {};
        let restoredMessages = stored.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));

        const storedGreetingContext =
          typeof metadataRef.current.greetingContext === "string"
            ? (metadataRef.current.greetingContext as string)
            : undefined;
        const hasSingleAssistantGreeting =
          restoredMessages.length === 1 &&
          restoredMessages[0].role === "assistant";

        if (
          hasSingleAssistantGreeting &&
          greetingContext &&
          storedGreetingContext !== greetingContext
        ) {
          restoredMessages = [
            {
              ...restoredMessages[0],
              content: defaultAssistantMessage,
            },
          ];
          metadataRef.current.greetingContext = greetingContext;
        }

        setMessages(restoredMessages);
        setInputMessage(stored.input ?? "");
        setIsExpanded(
          typeof stored.isExpanded === "boolean" ? stored.isExpanded : true
        );
        setHasInitialized(true);
        return;
      }
    }

    setMessages([
      {
        role: "assistant",
        content: defaultAssistantMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
    if (greetingContext) {
      metadataRef.current.greetingContext = greetingContext;
    }
    setIsExpanded(true);
    setHasInitialized(true);
  }, [
    conversationId,
    conversationStore,
    hasInitialized,
    defaultAssistantMessage,
    greetingContext,
  ]);

  useEffect(() => {
    if (!hasInitialized) return;
    adjustTextareaHeight();
  }, [hasInitialized]);

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

  useEffect(() => {
    if (!hasInitialized) return;
    adjustTextareaHeight();
  }, [inputMessage, hasInitialized]);

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight();
  };

  const persistState = useCallback(
    (nextMessages: ChatMessage[], nextInput: string, nextExpanded: boolean) => {
      if (!conversationId || !conversationStore) return;
      const MAX = 50;
      const trimmed = nextMessages
        .slice(-MAX)
        .map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
      if (greetingContext) {
        metadataRef.current = {
          ...metadataRef.current,
          greetingContext,
        };
      }
      conversationStore.save(conversationId, {
        messages: trimmed,
        input: nextInput,
        isExpanded: nextExpanded,
        metadata: metadataRef.current,
      });
      onConversationStateChange?.({
        messages: nextMessages,
        input: nextInput,
        isExpanded: nextExpanded,
      });
    },
    [conversationId, conversationStore, onConversationStateChange, greetingContext]
  );

  useEffect(() => {
    if (!hasInitialized) return;
    persistState(messages, inputMessage, isExpanded);
  }, [messages, inputMessage, isExpanded, persistState, hasInitialized]);

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

  // Clear all error states
  const clearAllErrors = useCallback(() => {
    clearError();
    setError(null);
    setIsTimeoutError(false);
    setRetryData(null);
  }, [clearError]);

  const handleResetConversation = useCallback(() => {
    if (isLoading) {
      return;
    }
    clearAllErrors();
    clearImage();
    metadataRef.current = {};
    if (greetingContext) {
      metadataRef.current.greetingContext = greetingContext;
    }
    if (conversationId && conversationStore) {
      conversationStore.clear(conversationId);
    }
    setMessages([
      {
        role: "assistant",
        content: defaultAssistantMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInputMessage("");
    setIsExpanded(true);
  }, [
    clearAllErrors,
    clearImage,
    conversationId,
    conversationStore,
    defaultAssistantMessage,
    greetingContext,
    isLoading,
  ]);

  // Convert file to base64 for API
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  // Execute message (used by both sendMessage and retry)
  const executeMessage = useCallback(
    async (
      userMessage: string,
      imageToProcess: File | null,
      compressedImageForApi: string | null,
      requestCtx: RequestContext
    ) => {
      setIsLoading(true);
      clearAllErrors();

      // Start intelligent loading sequence
      startIntelligentLoading(userMessage, !!imageToProcess);

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

        const mergedContext: RequestContext = requestCtx
          ? { ...requestCtx }
          : {};

        if (currentFormState) {
          mergedContext.current_form_state = currentFormState;
        }

        if (selectedRecipe) {
          const existingSelected = mergedContext.selected_recipe
            ? { ...mergedContext.selected_recipe }
            : undefined;
          const ingredientsWithAmounts =
            existingSelected?.ingredients ||
            selectedRecipe.ingredients.map((ing) =>
              `${ing.amount ?? ""} ${ing.unit ?? ""} ${ing.name}`.trim()
            );

          mergedContext.selected_recipe = {
            ...existingSelected,
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
            ingredients: ingredientsWithAmounts,
            description:
              existingSelected?.description ?? selectedRecipe.description,
          };
        }

        const requestBody = {
          message: userMessage || (imageToProcess ? "" : ""),
          locale: locale,
          conversation_history: messages,
          ...(imageData && { images: [imageData] }),
          context: mergedContext,
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

          // Check if this is a timeout error (422 status or timeout code)
          if (response.status === 422 || errorData.code === "TIMEOUT_ERROR") {
            const timeoutError = new Error(
              errorData.message || "Request timed out"
            );
            timeoutError.name = "TimeoutError";
            throw timeoutError;
          }

          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // Type the data as ChatResponse now that we know it's a successful response
        const chatData = data as ChatResponse;

        // Instead of overwriting messages, just append the assistant's response
        // This preserves the user's message with its image URL
        const assistantResponse = {
          role: "assistant" as const,
          content: chatData.response || "",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantResponse]);

        // Handle function calls
        if (chatData.function_call && onRecipeGenerated) {
          if (chatData.function_call.function === "update_recipe_form") {
            const result = chatData.function_call.result as {
              formUpdate?: unknown;
              success?: boolean;
            };
            if (result?.formUpdate) {
              onRecipeGenerated(result.formUpdate);
            }
          } else if (
            chatData.function_call.function === "extract_recipe_from_url"
          ) {
            const result = chatData.function_call.result as {
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

        // Check if this is a timeout error
        const isTimeout =
          err instanceof Error &&
          (err.name === "TimeoutError" ||
            err.message.includes("timeout") ||
            err.message.includes("TIMEOUT_ERROR"));

        if (isTimeout) {
          setIsTimeoutError(true);
          setError(t("timeoutError"));

          // Store retry data
          setRetryData({
            message: userMessage,
            imageFile: imageToProcess,
            compressedImageData: compressedImageForApi,
            context: requestCtx,
          });
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to send message"
          );
        }
      } finally {
        setIsLoading(false);
        stopIntelligentLoading();
      }
    },
  [
    messages,
    locale,
    onRecipeGenerated,
    startIntelligentLoading,
    stopIntelligentLoading,
    clearAllErrors,
    fileToBase64,
    t,
    currentFormState,
    selectedRecipe,
  ]
);

  // Retry last request
  const handleRetry = useCallback(async () => {
    if (!retryData || isLoading) return;

    // Restore the retry data
    const { message, imageFile, compressedImageData, context } = retryData;

    // Execute the retry with the same parameters
    await executeMessage(message, imageFile, compressedImageData, context);
  }, [retryData, isLoading, executeMessage]);

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

    // Clear form
    setInputMessage("");
    clearImage();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Build context
    const context = {
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
    };

    // Execute the message
    await executeMessage(
      userMessage,
      imageToProcess,
      compressedImageForApi,
      context
    );
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
        onClick={() => {
          if (!isDesktopSidebar) {
            setIsExpanded((prev) => !prev);
          }
        }}
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
          <div className="flex items-center gap-2">
            {enableManualReset && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={isLoading}
                title={locale === "nl" ? "Chat resetten" : "Reset chat"}
                aria-label={locale === "nl" ? "Chat resetten" : "Reset chat"}
                onClick={(event) => {
                  event.stopPropagation();
                  handleResetConversation();
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {/* Unit Preference Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={t("unitPreferencesSettings") || "Unit preferences"}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <UnitPreferenceSetting />
              </PopoverContent>
            </Popover>
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
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={clearAllErrors}
                      className="text-destructive hover:text-destructive/80 ml-2"
                      aria-label={t("dismissError")}
                    >
                      ×
                    </button>
                  </div>
                  {isTimeoutError && retryData && (
                    <div className="mt-2 pt-2 border-t border-destructive/20">
                      <Button
                        onClick={handleRetry}
                        disabled={isLoading}
                        size="sm"
                        variant="outline"
                        className="text-xs border-destructive/30 hover:border-destructive/50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            {t("retrying")}
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t("tryAgain")}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
                    {t("dropImageOverlay")}
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
                        ? t("addMessageAboutImage")
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
