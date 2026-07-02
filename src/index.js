'use strict';

// Content types that should be publicly readable by the website frontend.
// (All of this is public info: hours, menu, rooms, socials, promotions, pages.)
const PUBLIC_READ_ACTIONS = [
  'api::room.room.find',
  'api::room.room.findOne',
  'api::promotion.promotion.find',
  'api::promotion.promotion.findOne',
  'api::site-setting.site-setting.find',
  'api::menu.menu.find',
  'api::home-page.home-page.find',
  'api::about-page.about-page.find',
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Current live-site values, used to seed the CMS the first time (only when empty).
const SEED_ROOMS = [
  { name: 'Small Room', chinese: '小房', capacity: 8, pricePerHour: 30, roomNumbers: ['V3', 'V4', 'V7'], rank: 1 },
  { name: 'Medium Room', chinese: '中房', capacity: 12, pricePerHour: 40, roomNumbers: ['V1', 'V2', 'V6'], rank: 2 },
  { name: 'Large Room', chinese: '大房', capacity: 18, pricePerHour: 50, roomNumbers: ['V5', 'V9', 'V10'], rank: 3 },
  { name: 'VIP Room', chinese: '貴賓房', capacity: 28, pricePerHour: 70, roomNumbers: ['V8'], rank: 4 },
  { name: 'Club', chinese: '俱樂部', capacity: 60, pricePerHour: 120, roomNumbers: ['V11'], rank: 5 },
];

const SEED_SITE_SETTINGS = {
  phone: '(248) 616-0168',
  address: '32415 John R Rd, Madison Heights, MI 48071',
  googleMapsUrl: 'https://maps.app.goo.gl/inBdttJh4tdPKHvr8',
  orderUrl:
    'https://order.mealkeyway.com/customer/release/index?mid=6f744d61564c424268724d2f56753473526f6d7634773d3d',
  reserveUrl: 'https://tableagent.com/detroit/168-crab-karaoke/',
  roomsPolicy: 'Room charge doubles per hour after 10 PM · Minimum 3-hour reservation',
  facebook: 'https://www.facebook.com/168crabktv/',
  instagram: 'https://www.instagram.com/168_crab_karaoke/?hl=en',
  tiktok: 'https://www.tiktok.com/@168crabkaraoke',
  openingHours: DAYS.map((day) => ({ day, hours: '4:00 PM - 12:00 AM' })),
};

// Newly-added scalar fields that should be backfilled onto an already-seeded
// Site Settings entry (won't overwrite values the marketing team has set).
const SITE_SETTINGS_BACKFILL = ['googleMapsUrl', 'roomsPolicy'];

const SEED_HOME_PAGE = {
  heroTitle: '168 Crab & Karaoke',
  heroSubtitle: "Sing Your Heart Out with Fresh Seafood: Michigan's Must-Visit Hotspot!",
  heroBottomText: 'Fun-filled night of seafood, karaoke and more? Book Now!',
  partyHeading: "IT'S TIME TO PARTY",
  partyCtaText: 'BOOK NOW',
  equipmentHeading: 'Equipped with State of the Art Equipment...',
  equipmentSubheading: 'HOT Music at your fingertips!',
};

const SEED_ABOUT_PAGE = {
  introText:
    "At 168 Crab & Karaoke, we're not just a restaurant; we're a destination for unforgettable experiences. Nestled in the heart of Madison Heights, Michigan, our vibrant establishment combines the thrill of karaoke with the indulgence of seafood boils. From the moment you step through our doors, you're greeted with an atmosphere buzzing with energy and excitement. Whether you're belting out your favorite tunes in our private karaoke rooms or savoring our mouthwatering seafood specialties, every visit promises to be a celebration. We're dedicated to delivering exceptional service, quality food, and a lively ambiance that keeps our guests coming back for more.",
  offerHeading: 'WHAT WE OFFER',
  offerText:
    "At 168 Crab & Karaoke, we offer an unparalleled fusion of culinary delights and entertainment. Our party rooms provide the perfect setting for celebrations, whether it's a birthday bash, a corporate event, or a night out with friends. With an extensive selection of songs and state-of-the-art sound systems, our karaoke experience is second to none. Dive into our delectable seafood boils, featuring fresh crab, shrimp, and an array of flavorful seasonings. Additionally, our bar menu boasts an impressive lineup of cocktails and beverages to complement your meal. Come join the festivities and discover why 168 Crab & Karaoke is the ULTIMATE hotspot for food, fun, and festivities!",
};

async function seedSingleType(strapi, uid, data, label) {
  const current = await strapi.documents(uid).findFirst({});
  if (!current) {
    await strapi.documents(uid).create({ data });
    strapi.log.info(`[bootstrap] seeded ${label}`);
  }
  return current;
}

module.exports = {
  register(/*{ strapi }*/) {},

  /**
   * On boot: (1) grant the public role read access to the site's content types
   * so the Next.js frontend can fetch them without an API token, and (2) seed
   * the CMS with the current live-site values the first time (only when empty),
   * so marketing edits real data instead of starting blank. Both steps are
   * idempotent and fully guarded so they can never break startup.
   */
  async bootstrap({ strapi }) {
    // 1) Public read permissions
    try {
      const publicRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' }, populate: ['permissions'] });

      if (publicRole) {
        const existing = new Set((publicRole.permissions || []).map((p) => p.action));
        for (const action of PUBLIC_READ_ACTIONS) {
          if (!existing.has(action)) {
            await strapi.query('plugin::users-permissions.permission').create({
              data: { action, role: publicRole.id },
            });
          }
        }
      }
    } catch (err) {
      strapi.log.error(`[bootstrap] failed to set public read permissions: ${err.message}`);
    }

    // 2) Seed rooms (only if none exist)
    try {
      const rooms = await strapi.documents('api::room.room').findMany({});
      if (!rooms || rooms.length === 0) {
        for (const data of SEED_ROOMS) {
          await strapi.documents('api::room.room').create({ data });
        }
        strapi.log.info(`[bootstrap] seeded ${SEED_ROOMS.length} rooms`);
      }
    } catch (err) {
      strapi.log.error(`[bootstrap] failed to seed rooms: ${err.message}`);
    }

    // 3) Seed site settings (create if missing, else backfill newly-added fields)
    try {
      const current = await strapi.documents('api::site-setting.site-setting').findFirst({});
      if (!current) {
        await strapi.documents('api::site-setting.site-setting').create({ data: SEED_SITE_SETTINGS });
        strapi.log.info('[bootstrap] seeded site settings');
      } else {
        const patch = {};
        for (const key of SITE_SETTINGS_BACKFILL) {
          if (!current[key] && SEED_SITE_SETTINGS[key]) patch[key] = SEED_SITE_SETTINGS[key];
        }
        if (Object.keys(patch).length) {
          await strapi
            .documents('api::site-setting.site-setting')
            .update({ documentId: current.documentId, data: patch });
          strapi.log.info(`[bootstrap] backfilled site settings: ${Object.keys(patch).join(', ')}`);
        }
      }
    } catch (err) {
      strapi.log.error(`[bootstrap] failed to seed/backfill site settings: ${err.message}`);
    }

    // 4) Seed page content (only if not set)
    try {
      await seedSingleType(strapi, 'api::home-page.home-page', SEED_HOME_PAGE, 'home page');
      await seedSingleType(strapi, 'api::about-page.about-page', SEED_ABOUT_PAGE, 'about page');
    } catch (err) {
      strapi.log.error(`[bootstrap] failed to seed page content: ${err.message}`);
    }
  },
};
