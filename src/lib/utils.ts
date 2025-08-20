import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function setRedirectUrl(url: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('redirectAfterLogin', url)
  }
}

export function getRedirectUrl(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('redirectAfterLogin')
  }
  return null
}

export function clearRedirectUrl() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('redirectAfterLogin')
  }
}

export interface ProcessedInstructions {
  isStepFormat: boolean;
  steps: string[];
  originalText: string;
  descriptiveText?: string[];
}

export function processInstructions(description: string): ProcessedInstructions {
  const trimmedDescription = description.trim();
  
  if (!trimmedDescription) {
    return {
      isStepFormat: false,
      steps: [],
      originalText: description,
    };
  }

  // Check if already explicitly numbered (starts with "1." or contains newlines with numbers)
  const hasExplicitNumbers = /^\d+\.\s/.test(trimmedDescription) || 
                            /\n\s*\d+\.\s/.test(trimmedDescription);
  
  // If already numbered, separate numbered steps from descriptive text
  if (hasExplicitNumbers) {
    const allLines = trimmedDescription
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    const steps: string[] = [];
    const descriptiveText: string[] = [];
    
    // Separate lines that start with numbers from those that don't
    for (const line of allLines) {
      if (/^\d+\.\s/.test(line)) {
        // This is a numbered step - remove the number and add to steps
        const cleanStep = line.replace(/^\d+\.\s*/, '').trim();
        if (cleanStep) {
          steps.push(cleanStep);
        }
      } else {
        // This is descriptive text - add to descriptive text array
        descriptiveText.push(line);
      }
    }
    
    return {
      isStepFormat: true,
      steps,
      originalText: description,
      descriptiveText: descriptiveText.length > 0 ? descriptiveText : undefined,
    };
  }

  // Check for newline-separated content (likely steps)
  if (trimmedDescription.includes('\n')) {
    const lines = trimmedDescription
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    // If we have multiple meaningful lines, treat as steps
    if (lines.length > 1) {
      return {
        isStepFormat: true,
        steps: lines,
        originalText: description,
      };
    }
  }

  // Try to intelligently break single paragraph into steps
  const sentences = splitIntoSteps(trimmedDescription);
  
  // Only treat as steps if we can break it into meaningful chunks
  if (sentences.length > 1) {
    return {
      isStepFormat: true,
      steps: sentences,
      originalText: description,
    };
  }

  // Fallback: treat as single paragraph
  return {
    isStepFormat: false,
    steps: [trimmedDescription],
    originalText: description,
  };
}

function splitIntoSteps(text: string): string[] {

  // Try to split by common sentence endings followed by cooking actions
  const stepPattern = /([.!?])\s+(?=[A-Z])/g;
  let sentences = text.split(stepPattern).filter(part => part.trim() && part !== '.' && part !== '!' && part !== '?');
  
  // If we got multiple sentences, clean them up
  if (sentences.length > 1) {
    return sentences
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10) // Filter out very short fragments
      .map(sentence => {
        // Ensure sentences end with proper punctuation
        if (!/[.!?]$/.test(sentence)) {
          sentence += '.';
        }
        return sentence;
      });
  }

  // Fallback: split by periods but be more conservative
  sentences = text.split(/\.\s+/).filter(s => s.trim());
  
  if (sentences.length > 1) {
    return sentences
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 15) // Be more selective
      .map(sentence => {
        if (!/[.!?]$/.test(sentence)) {
          sentence += '.';
        }
        return sentence;
      });
  }

  // Return as single step if can't be meaningfully split
  return [text];
}
