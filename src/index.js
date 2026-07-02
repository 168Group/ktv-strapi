'use strict';

// Content types that should be publicly readable by the website frontend.
// (All of this is public info: hours, menu, rooms, socials, promotions.)
const PUBLIC_READ_ACTIONS = [
  'api::room.room.find',
  'api::room.room.findOne',
  'api::promotion.promotion.find',
  'api::promotion.promotion.findOne',
  'api::site-setting.site-setting.find',
  'api::menu.menu.find',
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
  orderUrl:
    'https://order.mealkeyway.com/customer/release/index?mid=6f744d61564c424268724d2f56753473526f6d7634773d3d',
  reserveUrl: 'https://tableagent.com/detroit/168-crab-karaoke/',
  facebook: 'https://www.facebook.com/168crabktv/',
  instagram: 'https://www.instagram.com/168_crab_karaoke/?hl=en',
  tiktok: 'https://www.tiktok.com/@168crabkaraoke',
  openingHours: DAYS.map((day) => ({ day, hours: '4:00 PM - 12:00 AM' })),
};

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

    // 3) Seed site settings (only if not set)
    try {
      const current = await strapi.documents('api::site-setting.site-setting').findFirst({});
      if (!current) {
        await strapi.documents('api::site-setting.site-setting').create({ data: SEED_SITE_SETTINGS });
        strapi.log.info('[bootstrap] seeded site settings');
      }
    } catch (err) {
      strapi.log.error(`[bootstrap] failed to seed site settings: ${err.message}`);
    }
  },
};
