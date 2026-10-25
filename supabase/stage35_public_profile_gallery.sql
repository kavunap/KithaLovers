-- KithaLovers Stage 35 — Public galleries for eligible authenticated viewers.
-- Run after stage34_profile_gallery.sql. Do not remove the owner's existing policy.
-- Profile photos live in the existing PUBLIC profile-photos storage bucket.
-- A public URL already known to someone cannot be revoked by these table policies.
GRANT SELECT ON public.profile_gallery_photos TO authenticated;
DROP POLICY IF EXISTS "Gallery read visible members" ON public.profile_gallery_photos;
CREATE POLICY "Gallery read visible members"
ON public.profile_gallery_photos
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_gallery_photos.user_id
        AND p.is_visible = true
        AND p.is_suspended = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profile_gallery_photos.user_id)
         OR (b.blocker_id = profile_gallery_photos.user_id AND b.blocked_id = auth.uid())
    )
  )
);
-- The existing Stage 34 INSERT/UPDATE/DELETE policies still restrict changes to owners.
