/**
 * Create or update the About singleton with default copy.
 * Team member images are omitted — upload them in Studio.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-about.mjs --with-user-token
 */
import { ABOUT_DOCUMENT_ID } from '@repo/shared';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

function block(text, key) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }]
  };
}

function paragraphs(entries) {
  return entries.map((text, index) => block(text, `p${index}`));
}

const ABOUT_COPY = [
  'Transmoderna is a hybrid collective situated at the intersection of electronic music and digital arts. It was founded in Berlin 2018.',
  'Today, the collective gathers a fluid group of artists and coders with its co-founders Steffen "Dixon" Berkhahn, music producer and DJ, and Ana Ofak, creative director and writer, cross-breeding competencies of the music industry, new media art theory, virtual reality productions, and game development.',
  'Previous art projects have been shown with Boiler Room, Fondation Beyeler in Basel, Art Basel in Miami, and Julia Stoschek Collection Düsseldorf.'
];

const TEAM_MEMBERS = [
  {
    _key: 'alan',
    name: 'Alan Ixba',
    position: 'Artist\nDeveloper',
    description: paragraphs([
      'Artist and developer working across real-time graphics, interactive installations, and live visual systems for club and gallery contexts.'
    ])
  },
  {
    _key: 'ana',
    name: 'Ana Ofak',
    position: 'Co-founder\nCreative Director\nWriter',
    description: paragraphs([
      'Creative director and writer. Co-founder of Transmoderna, working across editorial, visual identity, and new media art theory.'
    ])
  },
  {
    _key: 'carlos',
    name: 'Carlos Minozzi',
    position: 'Producer\nSound Designer',
    description: paragraphs([
      'Producer and sound designer exploring the overlap between electronic music production, spatial audio, and digital performance.'
    ])
  },
  {
    _key: 'joe',
    name: 'Joe Baran',
    position: 'Creative Technologist',
    description: paragraphs([
      'Creative technologist building tools and environments for virtual reality, game development, and immersive storytelling.'
    ])
  },
  {
    _key: 'marta',
    name: 'Marta Carro',
    position: 'Visual Artist\nResearcher',
    description: paragraphs([
      'Visual artist and researcher focused on moving image, scenography, and the aesthetics of hybrid physical-digital exhibitions.'
    ])
  },
  {
    _key: 'steffen',
    name: 'Steffen Berkhahn',
    position: 'Co-founder\nMusic Producer\nDJ',
    description: paragraphs([
      'Music producer and DJ, also known as Dixon. Co-founder of Transmoderna, bridging electronic music culture with digital art production.'
    ])
  },
  {
    _key: 'chloe',
    name: 'Chloe Karnezi',
    position: 'Designer\nArt Director',
    description: paragraphs([
      'Designer and art director shaping visual languages for releases, events, and cross-disciplinary projects within the collective.'
    ])
  }
].map((member) => ({
  _type: 'teamMember',
  _key: member._key,
  name: member.name,
  position: member.position,
  country: 'DE',
  description: member.description
}));

const document = {
  _id: ABOUT_DOCUMENT_ID,
  _type: 'about',
  description: paragraphs(ABOUT_COPY),
  teamMembers: TEAM_MEMBERS,
  contact: {
    heading: 'Contact',
    links: [
      {
        _type: 'connectLink',
        _key: 'email',
        label: 'studio@transmoderna.net',
        url: 'mailto:studio@transmoderna.net'
      },
      {
        _type: 'connectLink',
        _key: 'phone',
        label: '+49 160 9810627',
        url: 'tel:+491609810627'
      }
    ]
  },
  connect: {
    heading: 'Connect',
    links: [
      {
        _type: 'connectLink',
        _key: 'instagram',
        label: '@transmoderna',
        url: 'https://www.instagram.com/transmoderna/'
      },
      {
        _type: 'connectLink',
        _key: 'facebook',
        label: 'Facebook',
        url: 'https://www.facebook.com/transmoderna'
      }
    ]
  }
};

const existing = await client.fetch(`*[_id == $id][0]{ _id, teamMembers }`, {
  id: ABOUT_DOCUMENT_ID
});

const existingMembersByKey = new Map(
  (existing?.teamMembers ?? []).map((member) => [member._key, member])
);

const teamMembers = document.teamMembers.map((member) => {
  const existingMember = existingMembersByKey.get(member._key);
  if (!existingMember?.image) {
    return member;
  }

  return {
    ...member,
    image: existingMember.image
  };
});

if (existing) {
  await client
    .patch(ABOUT_DOCUMENT_ID)
    .set({
      description: document.description,
      teamMembers,
      contact: document.contact,
      connect: document.connect
    })
    .unset(['backgroundImage', 'copyright', 'contact.email', 'contact.phone', 'contact.body'])
    .commit();

  console.log('Updated About page content (existing member images preserved).');
} else {
  await client.create({
    ...document,
    teamMembers
  });
  console.log('Created About page with default content.');
}
