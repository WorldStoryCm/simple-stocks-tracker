import "server-only";

import { appRouter } from "@/server/routers/_app";
import { createCallerFactory, createContext } from "@/server/trpc";
import { headers } from "next/headers";

const createCaller = createCallerFactory(appRouter);

export async function getServerCaller() {
  const headersList = await headers();
  const req = new Request("http://localhost", { headers: headersList });
  const ctx = await createContext({ req, resHeaders: new Headers() });
  return createCaller(ctx);
}
