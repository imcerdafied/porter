# Porter

Porter is a zero-integration hotel concierge: a property can publish a branded QR-entry web chat, WhatsApp number, and SMS number without connecting a PMS, POS, or loyalty system.

## What is included

- Installable, mobile-first guest PWA at `/:property-slug`
- Static-token property editor at `/admin/:property-slug?token=...`
- Property-specific Claude responses grounded only in the knowledge base
- Stateful web, WhatsApp, and SMS conversations
- Signed Meta and Twilio webhook handlers
- Stored escalation flags when the concierge uses the canonical hedge response
- Printable property QR code and response-time instrumentation

## Local setup

Requirements: Node 20.19+ and Supabase CLI 2.101+.

```bash
npm install
cp .env.example .env.local
cp supabase/.env.example supabase/.env.local
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
npm run dev
```

Set the local values printed by `supabase status` in `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable or anon key>
```

The seed creates `atlantis-pilot`. Replace its known development admin token before any shared deployment.

## Production configuration

1. Create or choose a Supabase project and link it:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   supabase secrets set --env-file supabase/.env.production
   supabase functions deploy chat
   supabase functions deploy property-config
   supabase functions deploy admin-property
   supabase functions deploy whatsapp-webhook
   supabase functions deploy sms-webhook
   ```

2. Set frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy the Vite site behind HTTPS with SPA rewrites to `index.html`.
4. Insert each property through SQL or a trusted admin:

   ```sql
   insert into public.properties (
     slug, name, knowledge_base, admin_token, accent_color,
     whatsapp_phone_number_id, twilio_number
   ) values (
     'hotel-slug', 'Hotel Name', 'Current property facts...',
     '<random-token-at-least-16-characters>', '#1a56db',
     '<meta-phone-number-id>', '+15551234567'
   )
   returning slug, '/' || slug as printable_chat_path;
   ```

5. Point Meta to `/functions/v1/whatsapp-webhook` and Twilio to `/functions/v1/sms-webhook`.
6. Set `TWILIO_WEBHOOK_URL` to the exact public webhook URL Twilio signs.

Never expose a Supabase service-role or secret key in a browser environment.

## Validation

```bash
npm test
npm run build
supabase db reset
supabase functions serve chat --env-file supabase/.env.local
```

The live acceptance pass additionally requires a real Anthropic key, WhatsApp Business account, Twilio number, HTTPS frontend deployment, phone scans, and actual inbound/outbound messages.
