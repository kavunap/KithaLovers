-- Stage 28: Run after Stage 27. Does not replace existing messages or blocks.
CREATE TABLE IF NOT EXISTS public.message_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
 match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
 uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE,
 file_name text NOT NULL,
 mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf','text/plain')),
 file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(message_id)
);
CREATE INDEX IF NOT EXISTS message_attachments_match_idx ON public.message_attachments(match_id);
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members see attachments" ON public.message_attachments;
CREATE POLICY "Members see attachments" ON public.message_attachments FOR SELECT TO authenticated
USING (public.can_use_match(match_id,auth.uid()) AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id=message_id AND m.match_id=message_attachments.match_id AND m.deleted_at IS NULL));
DROP POLICY IF EXISTS "Members attach own messages" ON public.message_attachments;
CREATE POLICY "Members attach own messages" ON public.message_attachments FOR INSERT TO authenticated
WITH CHECK (uploader_id=auth.uid() AND public.can_use_match(match_id,auth.uid())
 AND storage_path LIKE (match_id::text || '/' || auth.uid()::text || '/%')
 AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id=message_id AND m.match_id=message_attachments.match_id AND m.sender_id=auth.uid() AND m.deleted_at IS NULL));
REVOKE ALL ON public.message_attachments FROM anon,authenticated;
GRANT SELECT,INSERT ON public.message_attachments TO authenticated;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('chat-attachments','chat-attachments',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf','text/plain'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Members upload chat attachments" ON storage.objects;
CREATE POLICY "Members upload chat attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='chat-attachments' AND (storage.foldername(name))[2]=auth.uid()::text
 AND public.can_use_match(((storage.foldername(name))[1])::uuid,auth.uid()));
DROP POLICY IF EXISTS "Members read chat attachments" ON storage.objects;
CREATE POLICY "Members read chat attachments" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='chat-attachments' AND public.can_use_match(((storage.foldername(name))[1])::uuid,auth.uid())
 AND EXISTS (SELECT 1 FROM public.message_attachments a WHERE a.storage_path=storage.objects.name AND a.match_id=((storage.foldername(name))[1])::uuid));
-- Prevent orphaned files from remaining after a message is soft-deleted by the Stage 27 RPC.
-- Object storage cleanup is an administrative maintenance task; deleted messages never expose signed URLs in the app.
