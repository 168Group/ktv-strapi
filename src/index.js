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

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/*{ strapi }*/) {},

  /**
   * Grant the public role read access to the site's content types so the
   * Next.js frontend can fetch them without an API token. Idempotent — runs
   * on every boot and only creates permissions that are missing.
   */
  async bootstrap({ strapi }) {
    try {
      const publicRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' }, populate: ['permissions'] });

      if (!publicRole) return;

      const existing = new Set((publicRole.permissions || []).map((p) => p.action));

      for (const action of PUBLIC_READ_ACTIONS) {
        if (!existing.has(action)) {
          await strapi.query('plugin::users-permissions.permission').create({
            data: { action, role: publicRole.id },
          });
        }
      }
    } catch (err) {
      strapi.log.error(`[bootstrap] failed to set public read permissions: ${err.message}`);
    }
  },
};
