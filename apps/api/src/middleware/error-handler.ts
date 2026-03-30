import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

/**
 * Global error handler — ensures all errors return ApiResponse format.
 */
export function errorHandler(err: Error, c: Context) {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof HTTPException) {
    return c.json(
      { success: false, error: err.message },
      err.status
    );
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
    return c.json(
      { success: false, error: "Validation failed", details: messages },
      400
    );
  }

  return c.json(
    {
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    },
    500
  );
}
