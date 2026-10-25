import type { ErrorRequestHandler, RequestHandler } from "express";

export const SERVER_ERROR_MESSAGE = "Something went wrong on the server.";

// Mounted on /api after every router, so a path no route matched gets JSON
// instead of Express's default HTML "Cannot GET ..." page.
export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

// The last middleware. Without it Express answers errors with an HTML page,
// and outside production that page includes the stack trace. Here every error
// becomes { error }, and only a 4xx keeps its message — those describe the
// request itself (body-parser's invalid JSON is 400, a too-large body is 413).
// Anything else may carry database or library details, so it's logged, never sent.
// Only statusCode counts: body-parser sets it, while plain `status` is a common
// field on unrelated errors (e.g. an upstream API's response code).
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  console.error(err);

  // A reply is already partly sent, so it can't be replaced — let Express close the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = err?.statusCode;
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 499) {
    res.status(statusCode).json({ error: typeof err.message === "string" && err.message ? err.message : "Bad request" });
    return;
  }

  res.status(500).json({ error: SERVER_ERROR_MESSAGE });
};
