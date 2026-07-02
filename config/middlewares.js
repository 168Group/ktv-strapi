module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    // Allow the admin panel to load media previews served from Cloudflare R2.
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', env('R2_PUBLIC_URL')],
          'media-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', env('R2_PUBLIC_URL')],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
