import { ActivityType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type LogInput = {
  ticketId: string
  actorId?: string | null
  type: ActivityType
  fromValue?: string | null
  toValue?: string | null
  message?: string | null
  meta?: Prisma.InputJsonValue
}

export class ActivityService {
  static async log(input: LogInput): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.ticketActivity.create({
          data: {
            ticketId: input.ticketId,
            actorId: input.actorId ?? null,
            type: input.type,
            fromValue: input.fromValue ?? null,
            toValue: input.toValue ?? null,
            message: input.message ?? null,
            meta: input.meta,
          },
        }),
        prisma.ticket.update({
          where: { id: input.ticketId },
          data: { updatedAt: new Date() },
        }),
      ])
    } catch (err) {
      console.error('[activity] log failed', err)
    }
  }

  static created(ticketId: string, actorId: string, title: string) {
    return this.log({ ticketId, actorId, type: ActivityType.CREATED, toValue: title })
  }

  static edited(ticketId: string, actorId: string, fieldsChanged: string[]) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.EDITED,
      message: fieldsChanged.join(', '),
      meta: { fields: fieldsChanged },
    })
  }

  static statusChanged(ticketId: string, actorId: string, from: string, to: string) {
    return this.log({ ticketId, actorId, type: ActivityType.STATUS_CHANGED, fromValue: from, toValue: to })
  }

  static priorityChanged(ticketId: string, actorId: string, from: string, to: string) {
    return this.log({ ticketId, actorId, type: ActivityType.PRIORITY_CHANGED, fromValue: from, toValue: to })
  }

  static assigned(ticketId: string, actorId: string, assigneeId: string, assigneeName: string) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.ASSIGNED,
      toValue: assigneeName,
      meta: { assigneeId },
    })
  }

  static unassigned(ticketId: string, actorId: string, previousAssigneeName?: string | null) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.UNASSIGNED,
      fromValue: previousAssigneeName ?? null,
    })
  }

  static scheduled(ticketId: string, actorId: string, from: Date | null, to: Date) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.SCHEDULED,
      fromValue: from?.toISOString() ?? null,
      toValue: to.toISOString(),
    })
  }

  static unscheduled(ticketId: string, actorId: string, from: Date | null) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.UNSCHEDULED,
      fromValue: from?.toISOString() ?? null,
    })
  }

  static deleted(ticketId: string, actorId: string) {
    return this.log({ ticketId, actorId, type: ActivityType.DELETED })
  }

  static restored(ticketId: string, actorId: string) {
    return this.log({ ticketId, actorId, type: ActivityType.RESTORED })
  }

  static commented(ticketId: string, actorId: string, commentId: string, internal: boolean, preview: string) {
    return this.log({
      ticketId,
      actorId,
      type: internal ? ActivityType.INTERNAL_NOTE : ActivityType.COMMENTED,
      message: preview.slice(0, 280),
      meta: { commentId, internal },
    })
  }

  static commentEdited(ticketId: string, actorId: string, commentId: string) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.COMMENT_EDITED,
      meta: { commentId },
    })
  }

  static commentDeleted(ticketId: string, actorId: string, commentId: string) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.COMMENT_DELETED,
      meta: { commentId },
    })
  }

  static imageUploaded(ticketId: string, actorId: string, filename: string, scope: 'ticket' | 'comment', commentId?: string) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.IMAGE_UPLOADED,
      toValue: filename,
      meta: commentId ? { scope, commentId } : { scope },
    })
  }

  static imageDeleted(ticketId: string, actorId: string, filename: string, scope: 'ticket' | 'comment') {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.IMAGE_DELETED,
      fromValue: filename,
      meta: { scope },
    })
  }

  static relationAdded(ticketId: string, actorId: string, relationType: string, targetTicketId: string) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.RELATION_ADDED,
      toValue: relationType,
      meta: { targetTicketId },
    })
  }

  static relationRemoved(ticketId: string, actorId: string, relationType: string, targetTicketId: string) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.RELATION_REMOVED,
      fromValue: relationType,
      meta: { targetTicketId },
    })
  }

  static categoryChanged(ticketId: string, actorId: string, from: string | null, to: string | null) {
    return this.log({
      ticketId,
      actorId,
      type: ActivityType.CATEGORY_CHANGED,
      fromValue: from,
      toValue: to,
    })
  }
}
