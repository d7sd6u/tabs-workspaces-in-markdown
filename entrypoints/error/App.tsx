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
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          {!dataDir.data && !dataDir.isLoading
            ? 'You have to set dataDir!'
            : 'Unknown error'}
        </AlertDescription>
      </Alert>
    </>
  );
}

export default withClient(<App />);
