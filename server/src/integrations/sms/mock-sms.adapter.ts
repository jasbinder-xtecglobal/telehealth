import type { ClockPort, SentMessage, SmsPort } from "../ports.ts";

/**
 * In-memory SMS gateway.
 *
 * Keeps an outbox so the prototype can show exactly what a patient would have
 * received — which is also how the "nothing is delivered before close" rule is
 * demonstrated.
 */
export class MockSmsAdapter implements SmsPort {
  private readonly outbox: SentMessage[] = [];

  constructor(
    private readonly clock: ClockPort,
    private readonly maxRetained = 200,
  ) {}

  async send(input: {
    to: string;
    body: string;
    links?: string[];
  }): Promise<SentMessage> {
    const message: SentMessage = {
      to: input.to,
      body: input.body,
      links: input.links ?? [],
      sentAt: this.clock.now(),
    };

    this.outbox.unshift(message);
    if (this.outbox.length > this.maxRetained) this.outbox.pop();

    console.log(`[sms] → ${input.to}: ${input.body}`);
    return message;
  }

  async recent(limit = 50): Promise<SentMessage[]> {
    return this.outbox.slice(0, limit);
  }
}
