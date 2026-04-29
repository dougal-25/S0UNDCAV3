-- Sound Cave — Storage bucket policies
-- Buckets created via REST: generated_images, generated_videos (both public read).
-- This file documents the RLS on storage.objects so the policies are reproducible.

do $$
declare b text;
begin
  foreach b in array array['generated_images','generated_videos']
  loop
    execute format($p$drop policy if exists "%1$s public read" on storage.objects$p$, b);
    execute format($p$create policy "%1$s public read" on storage.objects for select using (bucket_id = %1$L)$p$, b);

    execute format($p$drop policy if exists "%1$s owner write" on storage.objects$p$, b);
    execute format($p$create policy "%1$s owner write" on storage.objects for insert to authenticated with check (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b);

    execute format($p$drop policy if exists "%1$s owner update" on storage.objects$p$, b);
    execute format($p$create policy "%1$s owner update" on storage.objects for update to authenticated using (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b);

    execute format($p$drop policy if exists "%1$s owner delete" on storage.objects$p$, b);
    execute format($p$create policy "%1$s owner delete" on storage.objects for delete to authenticated using (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b);
  end loop;
end $$;
