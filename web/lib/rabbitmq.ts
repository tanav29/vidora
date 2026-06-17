import amqp from "amqplib";

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
let conn, channel;

export const QUEUE = "video-queue";

export async function getChannel() {
  if (channel) return channel;

  conn = await amqp.connect(RABBIT_URL);
  channel = await conn.createChannel();

  conn.on("close", () => {
    conn = channel = null;
  });
  conn.on("error", console.error);

  return channel;
}

export async function setupQueues() {
  const ch = await getChannel();

  await ch.assertQueue(QUEUE, {
    durable: true,
    deadLetterExchange: "dlx",
    deadLetterRoutingKey: QUEUE,
  });
}

export async function close() {
  await channel?.close();
  await conn?.close();
}
