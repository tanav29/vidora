import amqp from "amqplib";

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
let conn: any, channel: any;
let reconnecting = false;
type ReconnectHandler = (ch: any) => Promise<void>;
let reconnectHandler: ReconnectHandler | null = null;

export const QUEUE = "video-queue";
export const RETRY_QUEUE = "video-queue-retry";
export const DLX = "dlx";
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 30_000;

export function onReconnect(cb: ReconnectHandler) {
  reconnectHandler = cb;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  conn = await amqp.connect(RABBIT_URL);
  channel = await conn.createChannel();

  conn.on("close", () => {
    conn = null;
    channel = null;
    if (!reconnecting) {
      reconnecting = true;
      reconnect();
    }
  });
  conn.on("error", console.error);
}

async function reconnect() {
  for (let i = 0; i < 10; i++) {
    try {
      await sleep(Math.min(1000 * 2 ** i, 30000));
      await connect();
      await setupQueues();
      if (reconnectHandler) {
        await reconnectHandler(channel);
      }
      reconnecting = false;
      return;
    } catch (err) {
      console.error(`Reconnect attempt ${i + 1} failed:`, err);
    }
  }
  console.error("All reconnection attempts exhausted.");
}

export async function getChannel() {
  if (channel) return channel;
  if (!conn) {
    await connect();
  }
  return channel;
}

export async function setupQueues() {
  const ch = await getChannel();

  await ch.assertExchange(DLX, "direct", { durable: true });

  await ch.assertQueue(QUEUE, {
    durable: true,
    deadLetterExchange: DLX,
    deadLetterRoutingKey: QUEUE,
  });

  await ch.assertQueue(RETRY_QUEUE, {
    durable: true,
    messageTtl: RETRY_DELAY_MS,
    deadLetterExchange: "",
    deadLetterRoutingKey: QUEUE,
  });

  await ch.bindQueue(RETRY_QUEUE, DLX, QUEUE);
}

export function getRetryCount(msg: any): number {
  const death = msg.properties?.headers?.["x-death"];
  if (Array.isArray(death)) {
    const entry = death.find((d: any) => d.queue === QUEUE);
    if (entry && typeof entry.count === "number") return entry.count;
  }
  return 0;
}

export async function close() {
  try {
    await channel?.close();
  } finally {
    await conn?.close();
  }
}
