insert into public.properties (
  slug,
  name,
  knowledge_base,
  admin_token,
  accent_color
)
values (
  'atlantis-pilot',
  'Atlantis Resort',
  E'Check-in: 4 PM.\nCheck-out: 11 AM.\nPool hours: 7 AM–10 PM.\nRestaurant reservations: call extension 5200.',
  'replace-before-go-live-porter',
  '#0057b7'
)
on conflict (slug) do update set
  name = excluded.name,
  knowledge_base = excluded.knowledge_base,
  accent_color = excluded.accent_color;

select slug, '/' || slug as printable_chat_path
from public.properties
where slug = 'atlantis-pilot';
