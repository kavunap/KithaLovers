-- KithaLovers Stage 34 — profile photo gallery. Run after Stage 4 and Stage 33.
CREATE TABLE IF NOT EXISTS public.profile_gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_photo_url_nonempty CHECK (length(trim(photo_url))>0)
);
CREATE INDEX IF NOT EXISTS profile_gallery_photos_owner_sort_idx ON public.profile_gallery_photos(user_id,sort_order,created_at);
ALTER TABLE public.profile_gallery_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_gallery_photos FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profile_gallery_photos TO authenticated;
DROP POLICY IF EXISTS "Gallery read own" ON public.profile_gallery_photos;
CREATE POLICY "Gallery read own" ON public.profile_gallery_photos FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY IF EXISTS "Gallery insert own" ON public.profile_gallery_photos;
CREATE POLICY "Gallery insert own" ON public.profile_gallery_photos FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND (storage_path IS NULL OR storage_path LIKE auth.uid()::text || '/gallery/%'));
DROP POLICY IF EXISTS "Gallery update own" ON public.profile_gallery_photos;
CREATE POLICY "Gallery update own" ON public.profile_gallery_photos FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND (storage_path IS NULL OR storage_path LIKE auth.uid()::text || '/gallery/%'));
DROP POLICY IF EXISTS "Gallery delete own" ON public.profile_gallery_photos;
CREATE POLICY "Gallery delete own" ON public.profile_gallery_photos FOR DELETE TO authenticated USING (user_id=auth.uid());
-- Protect owner and path against changes. Clients may only reorder their photos.
CREATE OR REPLACE FUNCTION public.gallery_prevent_owner_change() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
   RAISE EXCEPTION 'Only gallery photo order may be updated';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS gallery_protect_owner ON public.profile_gallery_photos;
CREATE TRIGGER gallery_protect_owner BEFORE UPDATE ON public.profile_gallery_photos FOR EACH ROW EXECUTE FUNCTION public.gallery_prevent_owner_change();
-- Gallery photos use the existing public profile-photos bucket and its per-user storage policies.
-- The main profile photo is still stored in profiles.photo_url for backward compatibility.
