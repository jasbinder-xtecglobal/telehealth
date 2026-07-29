import type { ClockPort } from "./ports.ts";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

/** Test double — advance time explicitly rather than sleeping. */
export class FixedClock implements ClockPort {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  advanceMinutes(m: number): void {
    this.current = new Date(this.current.getTime() + m * 60_000);
  }
}
