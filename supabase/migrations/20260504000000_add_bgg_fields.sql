alter table games
  add column if not exists bgg_id text,
  add column if not exists thumbnail text;
