export function flog(msg: unknown) {
  fwrite(msg, 'info.log');
}
export function ferror(msg: unknown) {
  fwrite(msg, 'error.log');
}

function fwrite(msg: unknown, filename: string) {
  const logFilePath = path.join(import.meta.dirname, '../data/' + filename);
  try {
    const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
    void fs.appendFile(logFilePath, str + '\n');
  } catch {
    void fs.appendFile(logFilePath, 'Failed to serialize log msg' + '\n');
  }
}
