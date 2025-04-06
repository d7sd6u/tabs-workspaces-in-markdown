import { createTRPCProxyClient } from '@trpc/client';
import { chromeLink } from 'trpc-browser/link';

import type { AppRouter } from '../background/router';

const port = chrome.runtime.connect();
export const chromeClient = createTRPCProxyClient<AppRouter>({
  links: [chromeLink({ port })],
});
