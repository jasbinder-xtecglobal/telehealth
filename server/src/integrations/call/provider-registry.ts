/**
 * The installed call adapters, in display order.
 *
 * Adding a vendor is one `new XProvider(...)` in `container.ts`; removing one is
 * deleting that argument and its adapter file. This class holds no vendor
 * knowledge of its own — it is a lookup, not a factory.
 */
import type { CallProviderId } from "../../db/schema/enums.ts";
import type { CallProviderPort, CallProviderRegistryPort } from "../ports.ts";

export class CallProviderRegistry implements CallProviderRegistryPort {
  private readonly byId: ReadonlyMap<CallProviderId, CallProviderPort>;

  constructor(private readonly providers: readonly CallProviderPort[]) {
    const map = new Map<CallProviderId, CallProviderPort>();
    for (const p of providers) {
      if (map.has(p.id)) {
        // Two adapters claiming one vendor id would make `get` arbitrary.
        throw new Error(`Duplicate call provider registered: ${p.id}`);
      }
      map.set(p.id, p);
    }
    this.byId = map;
  }

  list(): readonly CallProviderPort[] {
    return this.providers;
  }

  get(id: CallProviderId): CallProviderPort | undefined {
    return this.byId.get(id);
  }
}
