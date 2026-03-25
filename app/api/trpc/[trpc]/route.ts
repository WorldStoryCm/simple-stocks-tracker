import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/app/server/routers/_app';
import { createContext } from '@/app/server/trpc';
import { NextRequest } from 'next/server';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req, resHeaders: new Headers() }),
  });

export { handler as GET, handler as POST };
