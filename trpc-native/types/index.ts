import type {
  TRPCClientOutgoingMessage,
  TRPCErrorResponse,
  TRPCRequest,
  TRPCResultMessage,
} from '@trpc/server/rpc';

export interface TRPCChromeRequest {
  trpc: TRPCRequest | TRPCClientOutgoingMessage;
}

export interface TRPCChromeSuccessResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trpc: TRPCResultMessage<any>;
}

export interface TRPCChromeErrorResponse {
  trpc: TRPCErrorResponse;
}

export type TRPCChromeResponse =
  | TRPCChromeSuccessResponse
  | TRPCChromeErrorResponse;

export type TRPCChromeMessage = TRPCChromeRequest | TRPCChromeResponse;
export type RelayedTRPCMessage = TRPCChromeMessage & { relayed?: true };

export interface MessengerMethods {
  postMessage: (message: TRPCChromeMessage) => void;
  addMessageListener: (listener: (message: TRPCChromeMessage) => void) => void;
  removeMessageListener: (
    listener: (message: TRPCChromeMessage) => void,
  ) => void;
  addCloseListener: (listener: () => void) => void;
  removeCloseListener: (listener: () => void) => void;
}
