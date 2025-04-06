import { createChromeHandler } from '../trpc-native/adapter';
import { listenToStdin, sendMessageObj } from './nativeMessaging';
import { appRouter } from './router';

void listenToStdin(
  createChromeHandler({ router: appRouter, sendMsg: sendMessageObj }),
);
