import { asc, eq, ilike, or } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import { drugs, mbsItems } from "../../db/schema/index.ts";
import type { ReferenceRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleReferenceRepository
  extends DrizzleRepository
  implements ReferenceRepository
{
  async searchDrugs(term: string, limit = 30, tx?: Executor) {
    const trimmed = term.trim();

    if (trimmed.length < 2) {
      return this.exec(tx).query.drugs.findMany({
        orderBy: [asc(drugs.activeIngredient)],
        limit: 20,
      });
    }

    return this.exec(tx).query.drugs.findMany({
      where: or(
        ilike(drugs.activeIngredient, `%${trimmed}%`),
        ilike(drugs.productName, `%${trimmed}%`),
      ),
      orderBy: [asc(drugs.activeIngredient)],
      limit,
    });
  }

  async findDrug(id: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.drugs.findFirst({ where: eq(drugs.id, id) })) ?? null
    );
  }

  async listMbsItems(tx?: Executor) {
    return this.exec(tx).query.mbsItems.findMany({
      orderBy: [asc(mbsItems.itemNumber)],
    });
  }

  async findMbsItem(itemNumber: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.mbsItems.findFirst({
        where: eq(mbsItems.itemNumber, itemNumber),
      })) ?? null
    );
  }
}
