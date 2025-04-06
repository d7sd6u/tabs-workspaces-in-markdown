export async function getDataDir() {
  const res = await storage.getItem<string | null>('local:dataDir');
  if (!res) throw new Error('No dataDir!');
  return res;
}
export async function setDataDir(dataDir: string | null) {
  await storage.setItem<string | null>('local:dataDir', dataDir);
}
export async function getNewTab() {
  return await storage.getItem<string>('local:newTab', {
    fallback: 'about:newtab',
  });
}
export async function setNewTab(newTab: string | null) {
  await storage.setItem<string>('local:newTab', newTab);
}
export async function getPinDashboard() {
  return await storage.getItem<boolean>('local:pinDashboard', {
    fallback: false,
  });
}
export async function setPinDashboard(newTab: boolean) {
  await storage.setItem<boolean>('local:pinDashboard', newTab);
}
