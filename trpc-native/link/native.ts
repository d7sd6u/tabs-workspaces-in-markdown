import type { TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

import { isTRPCMessage } from '../shared/trpcMessage';
import { createBaseLink } from './internal/base';

export interface NativeLinkOptions {
  port: browser.runtime.Port;
}

export const nativeLink = <TRouter extends AnyRouter>(
  opts: NativeLinkOptions,
): TRPCLink<TRouter> => {
  return createBaseLink({
    postMessage(message) {
      opts.port.postMessage(message);
    },
    addMessageListener(listener) {
      opts.port.onMessage.addListener((res) => {
        if (!isTRPCMessage(res)) return;
        listener(res);
      });
    },
    removeMessageListener(listener) {
      opts.port.onMessage.removeListener((res) => {
        if (!isTRPCMessage(res)) return;
        listener(res);
      });
    },
    addCloseListener(listener) {
      opts.port.onDisconnect.addListener(listener);
    },
    removeCloseListener(listener) {
      opts.port.onDisconnect.removeListener(listener);
    },
  });
};
