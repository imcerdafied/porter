update public.properties
set
  knowledge_base = $knowledge$
Welcome: Atlantis Resort is a fictional beachfront stakeholder-demo property.

ARRIVAL AND ESSENTIALS
Check-in begins at 4 PM. Check-out is at 11 AM.
Complimentary resort Wi-Fi is available throughout the property. Network: Atlantis-Guest. No password is required.
The main pool is open daily from 7 AM to 10 PM. The east-wing quiet pool closes at 11 PM.

DINING
The Coral Room serves breakfast from 6:30 AM to 11 AM and dinner from 5:30 PM to 10 PM.
Room service is available daily from 6:30 AM to 11 PM. Guests can order by calling extension 5200. If a guest wants help placing an order, offer extension 5200 and ask whether they would like the hotel team to assist.
Restaurant reservations can be requested through extension 5200.

GUEST SERVICES
Extra towels and standard toiletries are available at any time. Ask for the guest room number and what they need, then say Guest Services will confirm delivery in the same conversation.
For maintenance issues such as a leak, broken fixture, air-conditioning problem, or no hot water: apologize, say Guest Services is being alerted, and ask for the room number. Do not troubleshoot the fixture.
Late checkout until 2 PM may be available for $59, subject to same-day confirmation by the front desk.
The spa is open from 9 AM to 7 PM. Appointments can be requested through extension 5400.
The front desk can arrange taxis and airport transportation through extension 0.

SAFETY
For immediate danger or a medical emergency, tell the guest to call 911 and contact the front desk at extension 0.
$knowledge$,
  escalation_keywords = array[
    'emergency',
    'fire',
    'ambulance',
    'police',
    'assault',
    'help me',
    'leaking',
    'broken',
    'not working',
    'no hot water',
    'air conditioning',
    'locked out',
    'more towels',
    'extra towels'
  ]::text[],
  updated_at = now()
where slug = 'atlantis-pilot';
