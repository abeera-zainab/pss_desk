// A typed application error carrying an HTTP status. Thrown from services,
// mapped to a JSON response by the central error handler.
export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError(400, msg, details);
export const unauthorized = (msg = "Unauthorized") => new AppError(401, msg);
export const forbidden = (msg = "You do not have permission to do this") => new AppError(403, msg);
export const notFound = (msg = "Not found") => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);
