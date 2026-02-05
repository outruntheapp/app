-- Enable pg_net so cron can call Edge Functions via net.http_post
create extension if not exists pg_net;
