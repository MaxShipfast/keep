-- Google stores the display name as full_name/name, not first_name, so fall back to its first word.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, first_name)
  values (
    new.id,
    new.email,
    nullif(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'first_name', ''),
        split_part(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ' ', 1)
      ),
      ''
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
