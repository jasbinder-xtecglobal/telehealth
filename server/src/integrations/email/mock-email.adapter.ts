import type { ClockPort, EmailPort, SentEmail } from "../ports.ts";

/**
 * In-memory transactional email.
 *
 * Keeps an outbox and prints verification links to the server log, so the
 * signup flow can be completed end to end without a mail provider. A real
 * adapter implements the same port against SES, Postmark or similar.
 */
export class MockEmailAdapter implements EmailPort {
  private readonly outbox: SentEmail[] = [];

  constructor(
    private readonly clock: ClockPort,
    private readonly maxRetained = 100,
  ) {}

  async send(input: {
    to: string;
    subject: string;
    body: string;
    link?: string;
  }): Promise<SentEmail> {
    const email: SentEmail = { ...input, sentAt: this.clock.now() };

    this.outbox.unshift(email);
    if (this.outbox.length > this.maxRetained) this.outbox.pop();

    console.log(`[email] → ${input.to}: ${input.subject}`);
    if (input.link) console.log(`[email]   link: ${input.link}`);

    return email;
  }

  async recent(limit = 20): Promise<SentEmail[]> {
    return this.outbox.slice(0, limit);
  }
}
