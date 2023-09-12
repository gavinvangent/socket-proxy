export class AppError extends Error {
  constructor(message: string, readable?: string) {
    super(readable || message)
    this.name = this.constructor.name
    this.error = message || readable

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = new Error(message).stack
    }
  }

  /**
   * The original detailed error message, use this to prevent unwanted
   * data leaks to the user/client, but still capture error information
   */
  public error: string

  static convert(error: Error, message?: string) {
    if (error instanceof AppError) {
      return error
    }

    return new AppError(error.message, message || 'An unexpected error occurred.')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message)
  }
}

export class NotImplementedError extends AppError {
  constructor(message: string = 'Not yet implemented') {
    super(message)
  }
}

export class NotSupportedError extends AppError {
  constructor(message: string = 'Not supported') {
    super(message)
  }
}
