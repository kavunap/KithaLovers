-- KithaLovers Stage 30. Run after Stage 29. Non-destructive migration.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
GRANT SELECT (edited_at,reply_to_id) ON public.messages TO authenticated;
GRANT INSERT (reply_to_id) ON public.messages TO authenticated;

-- Validate reply targets on all insert/update paths, not just in the UI.
CREATE OR REPLACE FUNCTION public.validate_chat_reply_target()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.reply_to_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.messages parent
   WHERE parent.id=NEW.reply_to_id AND parent.match_id=NEW.match_id
     AND parent.deleted_at IS NULL
 ) THEN RAISE EXCEPTION 'Reply must reference a non-deleted message in the same conversation'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_chat_reply_target_trigger ON public.messages;
CREATE TRIGGER validate_chat_reply_target_trigger
 BEFORE INSERT OR UPDATE OF reply_to_id,match_id ON public.messages
 FOR EACH ROW EXECUTE FUNCTION public.validate_chat_reply_target();

-- No direct UPDATE grant is needed for editing message bodies: the RPC enforces ownership,
-- match access, blocked-user rules, and soft-deletion status.
CREATE OR REPLACE FUNCTION public.edit_my_chat_message(p_message_id uuid,p_new_body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match uuid;
BEGIN
 IF p_new_body IS NULL OR length(btrim(p_new_body))=0 OR length(btrim(p_new_body))>4000
 THEN RAISE EXCEPTION 'Message must contain between 1 and 4000 characters'; END IF;
 SELECT match_id INTO v_match FROM public.messages
 WHERE id=p_message_id AND sender_id=auth.uid() AND deleted_at IS NULL;
 IF v_match IS NULL OR NOT public.can_use_match(v_match,auth.uid())
 THEN RAISE EXCEPTION 'Message unavailable'; END IF;
 IF EXISTS (SELECT 1 FROM public.message_attachments WHERE message_id=p_message_id)
    OR EXISTS (SELECT 1 FROM public.message_voice_notes WHERE message_id=p_message_id)
 THEN RAISE EXCEPTION 'Attachment and voice messages cannot be edited'; END IF;
 UPDATE public.messages SET body=btrim(p_new_body),edited_at=now()
 WHERE id=p_message_id AND sender_id=auth.uid() AND deleted_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.edit_my_chat_message(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_my_chat_message(uuid,text) TO authenticated;
