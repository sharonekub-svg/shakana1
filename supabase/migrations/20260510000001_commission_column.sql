-- Add commission_agorot to participants for transparency / auditing.
-- amount_agorot continues to be the total charged (items + commission).
alter table public.participants
  add column if not exists commission_agorot integer not null default 0
    check (commission_agorot >= 0);
