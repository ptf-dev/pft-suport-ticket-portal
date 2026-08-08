-- Directional relation types previously had no opposite, so the reciprocal row
-- was written with the SAME type and both tickets rendered the same label.
ALTER TYPE "TicketRelationType" ADD VALUE IF NOT EXISTS 'HAS_IDEA';
ALTER TYPE "TicketRelationType" ADD VALUE IF NOT EXISTS 'WILL_BE_IMPLEMENTED_BEFORE';
ALTER TYPE "TicketRelationType" ADD VALUE IF NOT EXISTS 'ROADMAP_INCLUDES';
