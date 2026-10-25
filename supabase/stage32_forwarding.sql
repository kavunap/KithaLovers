-- KithaLovers Stage 32: forwarding metadata. Apply after Stage 31.
-- Existing messages and private media are not modified.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_forwarded boolean NOT NULL DEFAULT false;
GRANT SELECT (is_forwarded), INSERT (is_forwarded) ON public.messages TO authenticated;
-- Existing Stage 3 match/block RLS and Stage 28/29 media storage RLS still apply.
-- A forwarded attachment/voice note is downloaded by its authorized participant,
-- re-uploaded to a NEW object in the target match, and given a NEW metadata record.
