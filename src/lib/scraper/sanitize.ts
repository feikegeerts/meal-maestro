// Limit for JSON-LD script content
const MAX_JSON_LENGTH = 100_000;

export function sanitizeText(text: string): string {
  // Remove potentially dangerous tags. We avoid the 's' (dotAll) flag for broader TS target compatibility.
  // '[\s\S]*?' is used to simulate dotAll non-greedy matches.
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .trim();
}

export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return "[INVALID_URL]";
  }
}

// Recursive sanitization to prevent prototype pollution
export function deepSanitizeObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepSanitizeObject);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      continue;
    sanitized[key] = deepSanitizeObject(value);
  }
  return sanitized;
}

export function safeJsonParse(jsonString: string): unknown {
  if (jsonString.length > MAX_JSON_LENGTH) {
    throw new Error("JSON too large");
  }
  const parsed = JSON.parse(jsonString);
  return deepSanitizeObject(parsed);
}

export function sanitizeErrorMessage(errorMessage: string): string {
  if (errorMessage.includes("HTTP_403_BLOCKED")) return errorMessage;
  const sanitized = errorMessage
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP_HIDDEN]")
    .replace(/\b[\w-]+\.local\b/gi, "[LOCAL_HOST]")
    .replace(/\blocalhost\b/gi, "[LOCAL_HOST]")
    .replace(/:\d{2,5}\b/g, "")
    .replace(/[a-zA-Z]:\\[^\s]*/g, "[PATH_HIDDEN]")
    .replace(/\/[a-zA-Z0-9_\-\/]+/g, "[PATH_HIDDEN]")
    .replace(/\s+at\s+.*/g, "")
    .replace(/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET/gi, "NETWORK_ERROR");

  if (sanitized.match(/NETWORK_ERROR|fetch/i)) {
    return "Unable to access the website - please check the URL and try again";
  }
  if (/timeout|TIMEOUT/i.test(sanitized)) {
    return "Website took too long to respond - please try again later";
  }
  if (/too large/i.test(sanitized)) {
    return "Website content is too large to process";
  }
  if (/HTML content/i.test(sanitized)) {
    return "URL does not contain a valid webpage";
  }
  if (/Invalid URL/i.test(sanitized)) {
    return "Please provide a valid website URL";
  }
  return "Unable to process the website - please try a different URL";
}

// Aggregate export for convenience if future DI is desired
export const Sanitizers = {
  sanitizeText,
  sanitizeUrl,
  sanitizeErrorMessage,
  safeJsonParse,
  deepSanitizeObject,
};
