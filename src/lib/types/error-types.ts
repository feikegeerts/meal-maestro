/**
 * Standardized error types and handling for the application
 * Provides consistent error reporting and logging across all services
 */

export enum ErrorCode {
  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MISSING_ENV_VAR = 'MISSING_ENV_VAR',
  
  // Authentication/Authorization errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  
  // Email service errors
  EMAIL_DELIVERY_ERROR = 'EMAIL_DELIVERY_ERROR',
  EMAIL_TEMPLATE_ERROR = 'EMAIL_TEMPLATE_ERROR',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // External service errors
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface ServiceError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  originalError?: Error;
  timestamp: Date;
  service: string;
  operation?: string;
}

export class ApplicationError extends Error {
  public readonly code: ErrorCode;
  public readonly service: string;
  public readonly operation?: string;
  public readonly details?: unknown;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    service: string,
    operation?: string,
    details?: unknown,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.service = service;
    this.operation = operation;
    this.details = details;
    this.timestamp = new Date();
    this.originalError = originalError;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  toJSON(): ServiceError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      originalError: this.originalError,
      timestamp: this.timestamp,
      service: this.service,
      operation: this.operation
    };
  }

  toString(): string {
    const parts = [
      `[${this.service}]`,
      this.operation ? `[${this.operation}]` : '',
      `${this.code}: ${this.message}`
    ].filter(Boolean);

    return parts.join(' ');
  }
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Error handler utility class for consistent error processing
 */
export class ErrorHandler {
  /**
   * Creates a standardized ServiceResult from any error
   */
  static handleError<T>(
    error: unknown,
    service: string,
    operation?: string
  ): ServiceResult<T> {
    if (error instanceof ApplicationError) {
      return {
        success: false,
        error: error.toJSON()
      };
    }

    if (error instanceof Error) {
      const serviceError: ServiceError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
        timestamp: new Date(),
        service,
        operation,
        originalError: error
      };

      return {
        success: false,
        error: serviceError
      };
    }

    // Handle non-Error objects
    const serviceError: ServiceError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: typeof error === 'string' ? error : 'Unknown error occurred',
      timestamp: new Date(),
      service,
      operation,
      details: typeof error === 'object' ? error : undefined
    };

    return {
      success: false,
      error: serviceError
    };
  }

  /**
   * Creates a success result
   */
  static success<T>(data: T): ServiceResult<T> {
    return {
      success: true,
      data
    };
  }

  /**
   * Logs error with appropriate level based on error type
   */
  static logError(error: ServiceError | ApplicationError): void {
    const errorInfo = error instanceof ApplicationError ? error.toJSON() : error;
    
    // Determine log level based on error code
    const isCritical = [
      ErrorCode.CONFIGURATION_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.AUTHENTICATION_ERROR
    ].includes(errorInfo.code);

    const logPrefix = isCritical ? '🚨' : '❌';
    const timestamp = errorInfo.timestamp.toISOString();
    
    if (isCritical) {
      console.error(
        `${logPrefix} CRITICAL [${timestamp}] ${errorInfo.service}:`,
        errorInfo.message,
        errorInfo.details
      );
    } else {
      console.warn(
        `${logPrefix} [${timestamp}] ${errorInfo.service}:`,
        errorInfo.message
      );
    }

    // Log original error stack trace if available in development
    if (process.env.NODE_ENV === 'development' && errorInfo.originalError?.stack) {
      console.error('Stack trace:', errorInfo.originalError.stack);
    }
  }

  /**
   * Determines if an error should be retried
   */
  static isRetryableError(error: ServiceError | ApplicationError): boolean {
    const errorCode = error instanceof ApplicationError ? error.code : error.code;
    
    const retryableCodes = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.EXTERNAL_API_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.DATABASE_ERROR // In some cases
    ];

    return retryableCodes.includes(errorCode);
  }

  /**
   * Sanitizes error for client response (removes sensitive information)
   */
  static sanitizeForClient(error: ServiceError | ApplicationError): {
    code: string;
    message: string;
  } {
    const errorInfo = error instanceof ApplicationError ? error.toJSON() : error;
    
    // In production, don't expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';
    
    const sensitiveErrors = [
      ErrorCode.DATABASE_ERROR,
      ErrorCode.CONFIGURATION_ERROR,
      ErrorCode.INTERNAL_ERROR
    ];

    if (isProduction && sensitiveErrors.includes(errorInfo.code)) {
      return {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again later.'
      };
    }

    return {
      code: errorInfo.code,
      message: errorInfo.message
    };
  }
}