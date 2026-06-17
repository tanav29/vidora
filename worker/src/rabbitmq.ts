import amqp from "amqplib";

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
let conn: any, channel: any;

export const QUEUE = "video-queue";

export async function getChannel() {
  if (channel) return channel;

  conn = await amqp.connect(RABBIT_URL);
  channel = await conn.createChannel();

  // auto-recover on TCP drop
  conn.on("close", () => {
    conn = channel = null;
  });
  conn.on("error", console.error);

  return channel;
}

export async function close() {
  await channel?.close();
  await conn?.close();
}
