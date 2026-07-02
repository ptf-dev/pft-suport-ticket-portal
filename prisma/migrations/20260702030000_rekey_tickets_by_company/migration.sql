-- Re-key all tickets to a readable format: 3-letter company prefix + sequence, e.g. FTM-042.
-- Replaces the earlier random 5-char keys. Sequence numbers are assigned per company in
-- ticket creation order so existing key order is preserved within each firm.

DO $$
DECLARE
  c RECORD;
  t RECORD;
  words TEXT[];
  letters TEXT;
  prefix TEXT;
  counter INT;
  candidate TEXT;
BEGIN
  FOR c IN SELECT id, name FROM companies LOOP
    words := regexp_split_to_array(trim(regexp_replace(c.name, '[^a-zA-Z0-9\s]', ' ', 'g')), '\s+');

    letters := '';
    FOR i IN 1..COALESCE(array_length(words, 1), 0) LOOP
      IF words[i] <> '' THEN
        letters := letters || upper(substr(words[i], 1, 1));
      END IF;
    END LOOP;

    IF length(letters) < 3 AND COALESCE(array_length(words, 1), 0) > 0 THEN
      letters := letters || upper(substr(words[1], 2));
    END IF;

    letters := regexp_replace(letters, '[^A-Z0-9]', '', 'g');
    prefix := substr(letters || 'XXX', 1, 3);

    counter := 0;
    FOR t IN SELECT id FROM tickets WHERE "companyId" = c.id ORDER BY "createdAt" ASC LOOP
      counter := counter + 1;
      LOOP
        candidate := prefix || '-' || lpad(counter::text, 3, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM tickets WHERE key = candidate AND id <> t.id);
        counter := counter + 1;
      END LOOP;
      UPDATE tickets SET key = candidate WHERE id = t.id;
    END LOOP;
  END LOOP;
END $$;
