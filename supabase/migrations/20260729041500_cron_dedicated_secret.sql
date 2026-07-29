do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'porter-pilot-report-check'
  ) then
    perform cron.unschedule('porter-pilot-report-check');
  end if;
  if exists (
    select 1 from cron.job where jobname = 'dispatch-prearrival-upsells'
  ) then
    perform cron.unschedule('dispatch-prearrival-upsells');
  end if;
  if exists (
    select 1 from cron.job where jobname = 'dispatch-rebook-offers'
  ) then
    perform cron.unschedule('dispatch-rebook-offers');
  end if;

  perform cron.schedule(
    'porter-pilot-report-check',
    '5 0 * * *',
    $job$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'porter_functions_url'
        ) || '/generate-pilot-report',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-porter-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'porter_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  perform cron.schedule(
    'dispatch-prearrival-upsells',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'porter_functions_url'
        ) || '/dispatch-prearrival-upsell',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-porter-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'porter_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  perform cron.schedule(
    'dispatch-rebook-offers',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'porter_functions_url'
        ) || '/dispatch-rebook-offer',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-porter-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'porter_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );
end;
$$;

comment on extension supabase_vault is
  'Porter scheduled functions read porter_functions_url and porter_cron_secret from Vault.';
