import type { Doctor } from "../db/schema/doctors.ts";
import type { ChatChannelName } from "../db/schema/enums.ts";
import type { EventBusPort } from "../integrations/ports.ts";
import type { ChatRepository } from "../repositories/ports.ts";

export class ChatService {
  constructor(
    private readonly chat: ChatRepository,
    private readonly events: EventBusPort,
  ) {}

  async list(channel: ChatChannelName) {
    return this.chat.list(channel);
  }

  async send(doctor: Doctor, channel: ChatChannelName, body: string) {
    const displayName = doctor.chosenName ?? `${doctor.firstName} ${doctor.lastName}`;

    const message = await this.chat.create({
      channel,
      authorId: doctor.id,
      authorName: `Dr ${displayName}`,
      body,
    });

    this.events.publish({ type: "chat.message", channel });
    return message;
  }
}
