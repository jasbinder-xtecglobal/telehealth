import { EventEmitter, on } from "node:events";
import type { DomainEvent, EventBusPort } from "../ports.ts";

/**
 * In-process event bus backing the live queue, presence and chat.
 *
 * A multi-instance deployment swaps this for Redis pub/sub or Postgres
 * LISTEN/NOTIFY — the port stays identical, so nothing above this line changes.
 */
export class InMemoryEventBus implements EventBusPort {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Every connected client subscribes; the default cap of 10 is far too low.
    this.emitter.setMaxListeners(0);
  }

  publish(event: DomainEvent): void {
    this.emitter.emit(event.type, event);
  }

  subscribe<T extends DomainEvent["type"]>(
    type: T,
    signal: AbortSignal,
  ): AsyncIterable<Extract<DomainEvent, { type: T }>> {
    const iterator = on(this.emitter, type, { signal });

    return {
      async *[Symbol.asyncIterator]() {
        for await (const args of iterator) {
          yield (args as unknown[])[0] as Extract<DomainEvent, { type: T }>;
        }
      },
    };
  }
}
