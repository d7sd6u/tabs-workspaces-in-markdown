import { ThemeProvider } from '@/components/lib/theme-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AppWindow, Pin, Vault } from 'lucide-react';

import { chromeClient } from './client';
import { queryClient, withClient } from './query';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <div className="p-4 w-[500px] flex flex-col gap-2">
        {/* <ModeToggle /> */}
        <Label htmlFor="DataDir">
          <Vault size={16} />
          Vault path
        </Label>
        <FieldInput name="DataDir" />
        <Label className="mt-2" htmlFor="DataDir">
          <AppWindow size={16} /> New tab URL
        </Label>
        <FieldInput name="NewTab" />
        <Label className="mt-2" htmlFor="DataDir">
          <Pin size={16} /> Pin workspace dashboard tab
        </Label>
        <FieldSwitch name="PinDashboard" />
      </div>
    </ThemeProvider>
  );
}

function FieldSwitch({ name }: { name: 'PinDashboard' }) {
  const query = useQuery({
    queryKey: [name],
    queryFn: () => chromeClient[`get${name}`].query(),
  });
  const mutation = useMutation({
    mutationFn: chromeClient[`update${name}`].mutate,
    onSuccess: (data) => {
      queryClient.setQueryData([name], data);
    },
  });
  return (
    <Switch
      checked={!!query.data}
      onCheckedChange={(value) => {
        mutation.mutate(value);
      }}
    />
  );
}

function FieldInput({ name }: { name: 'DataDir' | 'NewTab' }) {
  const { query, mutation } = useField(name);
  return (
    <Input
      name={name}
      value={query.data ?? ''}
      onChange={(v) => {
        mutation.mutate(v.target.value);
      }}
      placeholder={name}
    />
  );
}

function useField(name: 'DataDir' | 'NewTab') {
  const query = useQuery({
    queryKey: [name],
    queryFn: () => chromeClient[`get${name}`].query(),
  });
  const mutation = useMutation({
    mutationFn: chromeClient[`update${name}`].mutate,
    onSuccess: (data) => {
      queryClient.setQueryData([name], data);
    },
  });
  return { query, mutation };
}

export default withClient(<App />);
