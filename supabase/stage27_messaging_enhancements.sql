-- KithaLovers Stage 27. Run AFTER Stage 26. Existing messages and blocks are preserved.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
GRANT SELECT (deleted_at) ON public.messages TO authenticated;

-- The following functions check current match membership and bilateral blocks.
CREATE OR REPLACE FUNCTION public.can_use_match(p_match_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_user_id = (SELECT auth.uid()) AND EXISTS (
   SELECT 1 FROM public.matches m WHERE m.id = p_match_id
     AND p_user_id IN (m.user_one,m.user_two)
     AND NOT public.is_blocked_between_users(m.user_one,m.user_two)
 );
$$;
REVOKE ALL ON FUNCTION public.can_use_match(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_use_match(uuid,uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️','👍','😂')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id,user_id,emoji)
);
CREATE INDEX IF NOT EXISTS message_reactions_match_idx ON public.message_reactions(match_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Match members view reactions" ON public.message_reactions;
CREATE POLICY "Match members view reactions" ON public.message_reactions FOR SELECT TO authenticated
USING (public.can_use_match(match_id,auth.uid()));
DROP POLICY IF EXISTS "Match members add reactions" ON public.message_reactions;
CREATE POLICY "Match members add reactions" ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_use_match(match_id,auth.uid()) AND EXISTS (
 SELECT 1 FROM public.messages m WHERE m.id = message_id AND m.match_id = message_reactions.match_id AND m.deleted_at IS NULL
));
DROP POLICY IF EXISTS "Users remove own reactions" ON public.message_reactions;
CREATE POLICY "Users remove own reactions" ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid() AND public.can_use_match(match_id,auth.uid()));
REVOKE ALL ON public.message_reactions FROM anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.message_reactions TO authenticated;

CREATE TABLE IF NOT EXISTS public.match_typing (
 match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(match_id,user_id)
);
ALTER TABLE public.match_typing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.match_typing FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.set_match_typing(p_match_id uuid,p_typing boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.can_use_match(p_match_id,auth.uid()) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
 IF p_typing THEN
   INSERT INTO public.match_typing(match_id,user_id,expires_at) VALUES(p_match_id,auth.uid(),now()+interval '6 seconds')
   ON CONFLICT(match_id,user_id) DO UPDATE SET expires_at=excluded.expires_at;
 ELSE
   DELETE FROM public.match_typing WHERE match_id=p_match_id AND user_id=auth.uid();
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.get_match_typing(p_match_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.can_use_match(p_match_id,auth.uid()) THEN RETURN false; END IF;
 RETURN EXISTS (SELECT 1 FROM public.match_typing WHERE match_id=p_match_id AND user_id<>auth.uid() AND expires_at>now());
END $$;
REVOKE ALL ON FUNCTION public.set_match_typing(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_match_typing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_match_typing(uuid,boolean),public.get_match_typing(uuid) TO authenticated;

-- Soft deletion keeps conversation history intact but replaces message content.
-- The SECURITY DEFINER function is the only delete path; members cannot edit others' messages.
CREATE OR REPLACE FUNCTION public.delete_my_chat_message(p_message_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match uuid;
BEGIN
 SELECT match_id INTO v_match FROM public.messages WHERE id=p_message_id AND sender_id=auth.uid() AND deleted_at IS NULL;
 IF v_match IS NULL OR NOT public.can_use_match(v_match,auth.uid()) THEN RAISE EXCEPTION 'Message unavailable'; END IF;
 UPDATE public.messages SET body='Message deleted',deleted_at=now() WHERE id=p_message_id AND sender_id=auth.uid() AND deleted_at IS NULL;
 DELETE FROM public.message_reactions WHERE message_id=p_message_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_my_chat_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_chat_message(uuid) TO authenticated;
