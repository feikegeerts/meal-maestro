import { useState, useRef, useEffect, useCallback } from 'react';

interface LoadingSequence {
  message: string;
  duration: number;
}

interface UseIntelligentLoadingOptions {
  t: (key: string) => string; // Translation function
}

export function useIntelligentLoading({ t }: UseIntelligentLoadingOptions) {
  // State to hold the current loading message
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  
  // Ref to store the timer so we can clear it
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to start the intelligent loading sequence
  const startIntelligentLoading = useCallback((message: string, hasImage: boolean) => {
    // Clear any existing timer first
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    // Detect what type of request this is
    const hasUrl = /https?:\/\/[^\s]+/i.test(message);
    
    let loadingSequence: LoadingSequence[] = [];
    
    if (hasImage) {
      // Image processing sequence with timeout warning (total ~45+ seconds)
      loadingSequence = [
        { message: t("loading.analyzingImage"), duration: 2000 },
        { message: t("loading.understandingContent"), duration: 4000 },
        { message: t("loading.processingWithAI"), duration: 7000 },
        { message: t("loading.expectingDelay"), duration: 8000 }, // Show delay expectation at ~13 seconds
        { message: t("loading.finalizingRecipe"), duration: 7000 },
        { message: t("loading.almostDone"), duration: 17000 }, // Gets us to ~45 seconds
        { message: t("loading.takingLonger"), duration: 10000 }, // Timeout warning phase
      ];
    } else if (hasUrl) {
      // URL processing sequence with timeout warning (total ~45+ seconds)
      loadingSequence = [
        { message: t("loading.checkingURL"), duration: 500 },
        { message: t("loading.extractingRecipe"), duration: 2000 },
        { message: t("loading.processingIngredients"), duration: 5500 },
        { message: t("loading.expectingDelay"), duration: 12000 },
        { message: t("loading.finalizingRecipe"), duration: 15000 },
        { message: t("loading.almostDone"), duration: 10000 }, // Gets us to ~45 seconds
        { message: t("loading.takingLonger"), duration: 10000 }, // Timeout warning phase
      ];
    } else {
      // Text-only processing sequence with timeout warning (total ~45+ seconds)
      loadingSequence = [
        { message: t("loading.processingRequest"), duration: 3000 },
        { message: t("loading.thinkingAboutRecipe"), duration: 4000 },
        { message: t("loading.finalizingResponse"), duration: 8000 },
        { message: t("loading.optimizingIngredients"), duration: 12000 },
        { message: t("loading.addingDetails"), duration: 18000 }, // Gets us to ~45 seconds
        { message: t("loading.takingLonger"), duration: 10000 }, // Timeout warning phase
      ];
    }

    // Start the loading sequence
    let currentStep = 0;
    const runStep = () => {
      if (currentStep < loadingSequence.length) {
        const step = loadingSequence[currentStep];
        setLoadingMessage(step.message);
        
        loadingTimerRef.current = setTimeout(() => {
          currentStep++;
          runStep();
        }, step.duration);
      }
    };

    runStep();
  }, [t]);

  // Function to stop loading and clear the timer
  const stopIntelligentLoading = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoadingMessage("");
  }, []);

  // Cleanup timer when component unmounts
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  // Return what the component needs
  return {
    loadingMessage,
    startIntelligentLoading,
    stopIntelligentLoading
  };
}