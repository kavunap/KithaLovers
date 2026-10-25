-- KithaLovers Stage 31: conversation preferences and unread counts.
-- Run after Stage 30. Preserves matches, messages, blocks, and prior preferences.
CREATE TABLE IF NOT EXISTS public.match_conversation_settings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,match_id)
);
CREATE INDEX IF NOT EXISTS match_conversation_settings_user_idx ON public.match_conversation_settings(user_id);
ALTER TABLE public.match_conversation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.match_conversation_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE (pinned,archived,muted,updated_at) ON public.match_conversation_settings TO authenticated;
DROP POLICY IF EXISTS "Read own conversation settings" ON public.match_conversation_settings;
CREATE POLICY "Read own conversation settings" ON public.match_conversation_settings FOR SELECT TO authenticated
USING (user_id=auth.uid() AND public.can_use_match(match_id,auth.uid()));
DROP POLICY IF EXISTS "Insert own conversation settings" ON public.match_conversation_settings;
CREATE POLICY "Insert own conversation settings" ON public.match_conversation_settings FOR INSERT TO authenticated
WITH CHECK (user_id=auth.uid() AND public.can_use_match(match_id,auth.uid()));
DROP POLICY IF EXISTS "Update own conversation settings" ON public.match_conversation_settings;
CREATE POLICY "Update own conversation settings" ON public.match_conversation_settings FOR UPDATE TO authenticated
USING (user_id=auth.uid() AND public.can_use_match(match_id,auth.uid()))
WITH CHECK (user_id=auth.uid() AND public.can_use_match(match_id,auth.uid()));

-- Returns only caller's unblocked conversations; counts exclude the caller's messages and deleted messages.
CREATE OR REPLACE FUNCTION public.get_my_conversation_stats()
RETURNS TABLE(match_id uuid, unread_count bigint, last_message_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.id, COUNT(msg.id) FILTER (WHERE msg.sender_id <> auth.uid() AND msg.read_at IS NULL AND msg.deleted_at IS NULL)::bigint,
    MAX(msg.created_at)
  FROM public.matches m
  LEFT JOIN public.messages msg ON msg.match_id=m.id AND msg.deleted_at IS NULL
  WHERE auth.uid() IN (m.user_one,m.user_two)
    AND NOT public.is_blocked_between_users(m.user_one,m.user_two)
  GROUP BY m.id;
$$;
REVOKE ALL ON FUNCTION public.get_my_conversation_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_stats() TO authenticated;

-- Respect per-conversation mute for newly generated in-app message notifications.
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE recipient uuid; enabled boolean; blocked boolean; muted boolean;
BEGIN
  SELECT CASE WHEN m.user_one = new.sender_id THEN m.user_two ELSE m.user_one END INTO recipient
  FROM public.matches m WHERE m.id = new.match_id AND new.sender_id IN (m.user_one,m.user_two);
  IF recipient IS NULL THEN RETURN new; END IF;
  SELECT public.is_blocked_between_users(new.sender_id,recipient) INTO blocked;
  IF blocked THEN RETURN new; END IF;
  SELECT coalesce(p.in_app_messages,true) INTO enabled FROM public.notification_preferences p WHERE p.user_id=recipient;
  SELECT s.muted INTO muted FROM public.match_conversation_settings s WHERE s.user_id=recipient AND s.match_id=new.match_id;
  IF coalesce(enabled,true) AND NOT coalesce(muted,false) THEN
    INSERT INTO public.user_notifications(user_id,actor_id,type,title,body,target_path,entity_id)
    VALUES(recipient,new.sender_id,'message','New message',
      'You have a new message waiting in KithaLovers.','/messages/' || new.match_id::text,new.match_id);
  END IF;
  RETURN new;
END $$;
-- Existing message_notification_after_insert trigger automatically uses the replaced function.
