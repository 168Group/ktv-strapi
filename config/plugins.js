module.exports = ({ env }) => ({
  "users-permissions": {
    config: {
      jwtSecret: env("JWT_SECRET"),
    },
  },
  upload: {
    config: {
      // Cloudflare R2 (S3-compatible). Uploaded media is stored in R2 and
      // served from the public R2 URL. Credentials come from Railway env vars.
      provider: "aws-s3",
      providerOptions: {
        baseUrl: env("R2_PUBLIC_URL"),
        s3Options: {
          endpoint: env("R2_ENDPOINT"),
          region: "auto",
          credentials: {
            accessKeyId: env("R2_ACCESS_KEY_ID"),
            secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
          },
          params: {
            Bucket: env("R2_BUCKET"),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
