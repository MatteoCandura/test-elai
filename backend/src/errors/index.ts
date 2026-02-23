import { AppError } from "./app-error";

export { AppError };

export const Errors = {
	notFound: (resource: string) => new AppError(404, "NOT_FOUND", `${resource} not found`),
	unauthorized: (msg = "Invalid credentials") => new AppError(401, "UNAUTHORIZED", msg),
	forbidden: (msg = "Not authorized") => new AppError(403, "FORBIDDEN", msg),
	conflict: (msg: string) => new AppError(409, "CONFLICT", msg),
	badRequest: (msg: string) => new AppError(400, "BAD_REQUEST", msg),
};
