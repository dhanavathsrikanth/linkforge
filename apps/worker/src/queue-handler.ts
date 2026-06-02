import type { Env, ClickQueueMessage, BioEventQueueMessage } from './types';
import { UpstashRedis } from './upstash';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function handleClickBatch(
  messages: ClickQueueMessage[],
  env: Env,
  redis: UpstashRedis,
): Promise<void> {
  // 1. Write to Redis (fast path — immediate)
  const pipeline: string[][] = [];
  for (const msg of messages) {
    const { slug, device, browser, os, country, referrer, referrerDomain, variant, timestamp } = msg;
    const entry = JSON.stringify({
      ts: timestamp,
      device,
      browser,
      os,
      country,
      referrer: referrer ?? null,
      referrerDomain: referrerDomain ?? null,
      abVariant: variant ?? null,
    });
    const date = today();
    pipeline.push(['LPUSH', `clicks:${slug}`, entry]);
    pipeline.push(['LTRIM', `clicks:${slug}`, '0', '49']);
    pipeline.push(['INCR', `stats:clicks:${slug}:daily:${date}`]);
    pipeline.push(['INCR', `stats:clicks:${slug}:total`]);
    pipeline.push(['INCR', `stats:clicks:daily:${date}`]);
    pipeline.push(['INCR', `stats:clicks:total`]);
  }
  if (pipeline.length > 0) await redis.pipeline(pipeline);

  // 2. Forward to Next.js for side effects (PostHog, billing, webhooks)
  //    Fire-and-forget — the queue guarantees retry if this fails.
  for (const msg of messages) {
    fetch(`${env.API_URL}/api/internal/clicks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': env.WORKER_SECRET,
      },
      body: JSON.stringify({
        linkId: msg.linkId,
        slug: msg.slug,
        destination: msg.destination,
        variant: msg.variant,
        timestamp: new Date(msg.timestamp).toISOString(),
        ipHash: msg.ipHash,
        isUnique: msg.isUnique,
        device: msg.device,
        browser: msg.browser,
        os: msg.os,
        country: msg.country,
        city: msg.city,
        region: msg.region,
        referrer: msg.referrer,
        referrerDomain: msg.referrerDomain,
        language: msg.language,
        isQrScan: msg.isQrScan,
        isDeepLink: msg.isDeepLink,
      }),
    }).catch((err) => console.error('[queue] click forward failed', err));
  }
}

async function handleBioEventBatch(
  messages: BioEventQueueMessage[],
  env: Env,
  redis: UpstashRedis,
): Promise<void> {
  // Write to Redis (fast path)
  const pipeline: string[][] = [];
  for (const msg of messages) {
    const { galleryId, ts, country, city, region, device, browser, os, referrer, ipHash, isUnique } = msg;
    const date = ts.slice(0, 10);
    const viewKey = `bio:views:${galleryId}:${date}`;
    pipeline.push(['INCR', viewKey]);
    pipeline.push(['EXPIRE', viewKey, String(90 * 24 * 60 * 60)]);

    const entry = JSON.stringify({ ts, country, city, region, device, browser, os, referrer, ipHash, isUnique });
    pipeline.push(['LPUSH', `bio:events:${galleryId}`, entry]);
    pipeline.push(['LTRIM', `bio:events:${galleryId}`, '0', '499']);
    pipeline.push(['EXPIRE', `bio:events:${galleryId}`, String(90 * 24 * 60 * 60)]);
  }
  if (pipeline.length > 0) await redis.pipeline(pipeline);
}

export async function handleQueue(
  batch: MessageBatch<ClickQueueMessage | BioEventQueueMessage>,
  env: Env,
): Promise<void> {
  const redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);

  const clickMessages: ClickQueueMessage[] = [];
  const bioMessages: BioEventQueueMessage[] = [];

  for (const msg of batch.messages) {
    if (msg.body.type === 'click') {
      clickMessages.push(msg.body);
    } else if (msg.body.type === 'bio-view') {
      bioMessages.push(msg.body);
    }
  }

  const tasks: Promise<void>[] = [];
  if (clickMessages.length > 0) {
    tasks.push(handleClickBatch(clickMessages, env, redis));
  }
  if (bioMessages.length > 0) {
    tasks.push(handleBioEventBatch(bioMessages, env, redis));
  }

  await Promise.all(tasks);
}
