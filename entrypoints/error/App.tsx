import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

import { chromeClient } from './client';
import { withClient } from './query';

function App() {
  const dataDir = useQuery({
    queryKey: ['dataDir'],
    queryFn: () => chromeClient.getDataDir.query(),
  });
  if (dataDir.isLoading) return;
  return (
    <div className="h-screen flex justify-center items-center">
      <Alert className="w-96">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          {!dataDir.data ? 'You have to set dataDir!' : 'Unknown error'}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default withClient(<App />);
