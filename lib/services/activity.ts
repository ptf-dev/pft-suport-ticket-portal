import { ActivityType, Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isBounceTransition } from '@/lib/boomerang'
import { NotificationService } from './notification'

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

  static async statusChanged(ticketId: string, actorId: string, from: string, to: string) {
    await this.log({ ticketId, actorId, type: ActivityType.STATUS_CHANGED, fromValue: from, toValue: to })
    // Boomerang: client/dev sent a "waiting on client" ticket back into the queue.
    if (isBounceTransition(from, to)) {
      await this.recordBounce(ticketId, actorId)
    }
  }

  /** Stamp the denormalised boomerang counters used by the board/table highlight. */
  private static async recordBounce(ticketId: string, actorId: string | null): Promise<void> {
    try {
      let role: Role | null = null
      if (actorId) {
        const actor = await prisma.user.findUnique({
          where: { id: actorId },
          select: { role: true },
        })
        role = actor?.role ?? null
      }
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          bounceCount: { increment: 1 },
          reopenedAt: new Date(),
          reopenedByRole: role,
        },
        select: { bounceCount: true },
      })

      // Escalate repeat offenders: a ticket the client has sent back 2+ times is a
      // communication breakdown. Drop an internal note so it surfaces in the
      // timeline and the ops activity feed and can't quietly slip through.
      if (updated.bounceCount >= 2) {
        await this.log({
          ticketId,
          actorId: null,
          type: ActivityType.INTERNAL_NOTE,
          message: `⚠ Escalation: bounced back from Waiting ${updated.bounceCount}× — the client keeps disagreeing the fix is complete. Prioritise this and consider reaching out directly.`,
        })
        // Push an email to the owner + lead so a repeat reopen can't sit unseen.
        NotificationService.notifyEscalation(ticketId, updated.bounceCount).catch(() => {})
      }
    } catch (err) {
      console.error('[activity] recordBounce failed', err)
    }
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
