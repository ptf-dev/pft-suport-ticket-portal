-- Add a short 5-char human key to every ticket (for commit messages / GitHub search).

ALTER TABLE "tickets" ADD COLUMN "key" TEXT;

-- Backfill existing tickets with unique 5-char keys.
-- Alphabet excludes ambiguous chars (no I, L, O, 0, 1).
DO $$
DECLARE
  r RECORD;
  k TEXT;
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
BEGIN
  FOR r IN SELECT id FROM "tickets" WHERE "key" IS NULL LOOP
    LOOP
      k := '';
      FOR i IN 1..5 LOOP
        k := k || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "tickets" WHERE "key" = k);
    END LOOP;
    UPDATE "tickets" SET "key" = k WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX "tickets_key_key" ON "tickets"("key");
