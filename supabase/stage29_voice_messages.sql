-- Stage 29: voice messages. Run after Stage 28. Existing messages and attachments are retained.
CREATE TABLE IF NOT EXISTS public.message_voice_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 message_id uuid NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
 match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
 uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK (mime_type IN ('audio/webm','audio/mp4')),
 file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
 duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 1 AND 120),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_voice_notes_match_idx ON public.message_voice_notes(match_id);
ALTER TABLE public.message_voice_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants read voice notes" ON public.message_voice_notes;
CREATE POLICY "Participants read voice notes" ON public.message_voice_notes FOR SELECT TO authenticated
USING (public.can_use_match(match_id,auth.uid())
 AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id=message_id AND m.match_id=message_voice_notes.match_id AND m.deleted_at IS NULL));
DROP POLICY IF EXISTS "Sender creates voice note" ON public.message_voice_notes;
CREATE POLICY "Sender creates voice note" ON public.message_voice_notes FOR INSERT TO authenticated
WITH CHECK (uploader_id=auth.uid() AND public.can_use_match(match_id,auth.uid())
 AND storage_path LIKE (match_id::text || '/' || auth.uid()::text || '/%')
 AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id=message_id AND m.match_id=message_voice_notes.match_id AND m.sender_id=auth.uid() AND m.deleted_at IS NULL));
REVOKE ALL ON public.message_voice_notes FROM anon,authenticated;
GRANT SELECT,INSERT ON public.message_voice_notes TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('chat-voice','chat-voice',false,10485760,ARRAY['audio/webm','audio/mp4'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Participants upload voice" ON storage.objects;
CREATE POLICY "Participants upload voice" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='chat-voice'
 AND (storage.foldername(name))[2]=auth.uid()::text
 AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND public.can_use_match(((storage.foldername(name))[1])::uuid,auth.uid()));
DROP POLICY IF EXISTS "Participants download voice" ON storage.objects;
CREATE POLICY "Participants download voice" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='chat-voice'
 AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND public.can_use_match(((storage.foldername(name))[1])::uuid,auth.uid())
 AND EXISTS (SELECT 1 FROM public.message_voice_notes n WHERE n.storage_path=storage.objects.name
 AND n.match_id=((storage.foldername(name))[1])::uuid));
