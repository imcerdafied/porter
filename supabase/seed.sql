insert into public.properties (
  slug,
  name,
  knowledge_base,
  admin_token,
  accent_color,
  escalation_keywords
)
values (
  'atlantis-pilot',
  'Atlantis Resort',
  E'Welcome: Atlantis Resort is a fictional beachfront stakeholder-demo property.\n\nARRIVAL AND ESSENTIALS\nCheck-in begins at 4 PM. Check-out is at 11 AM.\nComplimentary resort Wi-Fi is available throughout the property. Network: Atlantis-Guest. No password is required.\nThe main pool is open daily from 7 AM to 10 PM. The east-wing quiet pool closes at 11 PM.\n\nDINING\nThe Coral Room serves breakfast from 6:30 AM to 11 AM and dinner from 5:30 PM to 10 PM.\nRoom service is available daily from 6:30 AM to 11 PM. Guests can order by calling extension 5200. If a guest wants help placing an order, offer extension 5200 and ask whether they would like the hotel team to assist.\nRestaurant reservations can be requested through extension 5200.\n\nGUEST SERVICES\nExtra towels and standard toiletries are available at any time. Ask for the guest room number and what they need, then say Guest Services will confirm delivery in the same conversation.\nFor maintenance issues such as a leak, broken fixture, air-conditioning problem, or no hot water: apologize, say Guest Services is being alerted, and ask for the room number. Do not troubleshoot the fixture.\nLate checkout until 2 PM may be available for $59, subject to same-day confirmation by the front desk.\nThe spa is open from 9 AM to 7 PM. Appointments can be requested through extension 5400.\nThe front desk can arrange taxis and airport transportation through extension 0.\n\nSAFETY\nFor immediate danger or a medical emergency, tell the guest to call 911 and contact the front desk at extension 0.',
  'replace-before-go-live-porter',
  '#0057b7',
  array['emergency','fire','ambulance','police','assault','help me','leaking','broken','not working','no hot water','air conditioning','locked out','more towels','extra towels']::text[]
)
on conflict (slug) do update set
  name = excluded.name,
  knowledge_base = excluded.knowledge_base,
  accent_color = excluded.accent_color,
  escalation_keywords = excluded.escalation_keywords;

select slug, '/' || slug as printable_chat_path
from public.properties
where slug = 'atlantis-pilot';
