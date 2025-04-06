import { ThemeProvider } from '@/components/lib/theme-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { FolderX, SquareArrowOutDownRight } from 'lucide-react';

import { chromeClient } from './client';
import { getFilter } from './filter';
import { withClient } from './query';

function App() {
  const name = location.hash.slice(1) || 'Unknown Workspace';
  const container = useQuery({
    queryKey: ['container'],
    queryFn: () => chromeClient.getContainer.query(name),
  });
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']") as
      | HTMLLinkElement
      | undefined;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = container.data?.iconUrl ?? '';
  }, [container.data?.iconUrl]);
  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <div className="flex flex-col gap-4 w-full h-[100vh] justify-center items-center">
        <div className="h-8">
          {container.data && (
            <img
              style={{ filter: getFilter(container.data.colorCode) }}
              src={container.data.iconUrl}
              className="h-full"
            />
          )}
        </div>
        <Label>{name}</Label>
        <Button
          className="hover:cursor-pointer"
          variant="destructive"
          onClick={() => {
            void chromeClient.closeWorkspace.mutate({
              name,
            });
          }}
        >
          <FolderX /> Close the "{name}" workspace
        </Button>
        <a target="_blank" href="about:blank">
          <Button className="hover:cursor-pointer">
            <SquareArrowOutDownRight /> Open new tab
          </Button>
        </a>
      </div>
    </ThemeProvider>
  );
}
export default withClient(<App />);
