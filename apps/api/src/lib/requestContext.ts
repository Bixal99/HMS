import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  return requestContext.getStore() ?? {};
}
