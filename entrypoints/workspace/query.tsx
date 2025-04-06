import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';

export const queryClient = new QueryClient();
export function withClient(children: ReactElement) {
  return function () {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}
