import { asc, eq } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import type { ChatChannelName } from "../../db/schema/enums.ts";
import { chatMessages } from "../../db/schema/index.ts";
import type { ChatRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleChatRepository
  extends DrizzleRepository
  implements ChatRepository
{
  async list(channel: ChatChannelName, limit = 200, tx?: Executor) {
    return this.exec(tx).query.chatMessages.findMany({
      where: eq(chatMessages.channel, channel),
      orderBy: [asc(chatMessages.createdAt)],
      limit,
    });
  }

  async create(
    input: {
      channel: ChatChannelName;
      authorId: string | null;
      authorName: string;
      body: string;
    },
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(chatMessages).values(input).returning();
    return row!;
  }
}
