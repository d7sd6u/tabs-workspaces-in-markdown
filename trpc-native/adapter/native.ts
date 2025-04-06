import { AnyProcedure, AnyRouter, TRPCError } from '@trpc/server';
import { Unsubscribable, isObservable } from '@trpc/server/observable';
import { getErrorShape } from '@trpc/server/shared';

import { isTRPCRequestWithId } from '../shared/trpcMessage';
import type { TRPCChromeResponse } from '../types';
import type { CreateHandlerOptions } from './base';
import { getErrorFromUnknown } from './errors';

export interface CreateChromeContextOptions {
  req: undefined;
  res: undefined;
}
interface ChromeOptions {
  sendMsg: (msg: unknown) => void;
}
interface ChromeContextOptions {
  req: undefined;
  res: undefined;
}

export const createChromeHandler = <TRouter extends AnyRouter>(
  opts: CreateHandlerOptions<TRouter, ChromeContextOptions, ChromeOptions>,
) => {
  const { router, createContext, onError, sendMsg } = opts;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { transformer } = router._def._config;
  const subscriptions = new Map<number | string, Unsubscribable>();
  const listeners: (() => void)[] = [];

  const onMessage = async (
    message: unknown,
  ): Promise<TRPCChromeResponse | null> => {
    if (!isTRPCRequestWithId(message)) return null;

    const { trpc } = message;
    const sendResponse = (response: TRPCChromeResponse['trpc']) => {
      return {
        trpc: { id: trpc.id, jsonrpc: trpc.jsonrpc, ...response },
      } as TRPCChromeResponse;
    };
    const sendResponseOffThread = (response: TRPCChromeResponse['trpc']) => {
      sendMsg(sendResponse(response));
    };

    if (trpc.method === 'subscription.stop') {
      subscriptions.get(trpc.id)?.unsubscribe();
      subscriptions.delete(trpc.id);
      return sendResponse({ result: { type: 'stopped' } });
    }
    const { method, params, id } = trpc;

    const ctx = await createContext?.({ req: undefined, res: undefined });
    const handleError = (cause: unknown) => {
      const error = getErrorFromUnknown(cause);

      onError?.({
        error,
        type: method,
        path: params.path,
        input: params.input,
        ctx,
        req: undefined,
      });

      return sendResponse({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: getErrorShape({
          config: router._def._config,
          error,
          type: method,
          path: params.path,
          input: params.input,
          ctx,
        }),
      });
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const input = transformer.input.deserialize(trpc.params.input);
      const caller = router.createCaller(ctx);

      const procedureFn = trpc.params.path
        .split('.')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
        .reduce<any>((acc, segment) => acc[segment], caller) as AnyProcedure;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await procedureFn(input);
      if (trpc.method !== 'subscription') {
        return sendResponse({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          result: { type: 'data', data: transformer.output.serialize(result) },
        });
      }

      if (!isObservable(result)) {
        const e = new TRPCError({
          message: `Subscription ${params.path} did not return an observable`,
          code: 'INTERNAL_SERVER_ERROR',
        });
        console.error(e);
        return handleError(e);
      }

      const subscription = result.subscribe({
        next: (data) => {
          const serializedData: unknown = transformer.output.serialize(data);
          sendResponseOffThread({
            result: { type: 'data', data: serializedData },
          });
        },
        error: (a) => {
          sendMsg(handleError(a));
        },
        complete: () => {
          sendResponseOffThread({ result: { type: 'stopped' } });
        },
      });

      if (subscriptions.has(id)) {
        subscription.unsubscribe();
        console.error(
          new TRPCError({
            message: `Duplicate id ${id}`,
            code: 'BAD_REQUEST',
          }),
        );
        return sendResponse({ result: { type: 'stopped' } });
      }

      listeners.push(() => {
        subscription.unsubscribe();
      });
      subscriptions.set(id, subscription);
      return sendResponse({ result: { type: 'started' } });
    } catch (cause) {
      return handleError(cause);
    }
  };

  return onMessage;
};
