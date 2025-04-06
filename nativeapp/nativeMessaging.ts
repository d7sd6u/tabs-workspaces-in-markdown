import fs from 'node:fs/promises';
import { TextDecoder, TextEncoder } from 'node:util';

async function getMessage(): Promise<Uint8Array> {
  const header = new Uint32Array(1);
  await readFullAsync(1, header as unknown as Uint8Array<ArrayBuffer>);
  const message = await readFullAsync(header[0]);
  return message;
}

async function readFullAsync(length: number, buffer = new Uint8Array(65536)) {
  const data = [];
  while (data.length < length) {
    const input = await fs.open('/dev/stdin');
    const { bytesRead } = await input.read({ buffer });
    await input.close();
    if (bytesRead === 0) {
      break;
    }
    data.push(...buffer.subarray(0, bytesRead));
  }
  return new Uint8Array(data);
}

export function sendMessage(message: Uint8Array) {
  const header = Buffer.from(new Uint32Array([message.length]).buffer);
  const stdout = process.stdout;
  stdout.write(header);
  stdout.write(message);
}

export function sendMessageObj(obj: unknown) {
  const outputStr = JSON.stringify(obj);
  const output = new TextEncoder().encode(outputStr);

  sendMessage(output);
}

export async function listenToStdin(
  handler: (input: unknown) => Promise<unknown>,
) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    try {
      const input = await getMessage();

      let output = input;
      try {
        const inputStr = new TextDecoder().decode(input);
        const inputJson: unknown = JSON.parse(inputStr);
        const outputJson = await handler(inputJson);
        const outputStr = JSON.stringify(outputJson);
        // void fs.appendFile(
        //   path.join(import.meta.dirname, '../data/msg.log'),
        //   inputStr + '\n' + outputStr + '\n',
        // );
        output = new TextEncoder().encode(outputStr);
      } catch {
        /* empty */
      }

      sendMessage(output);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
}
