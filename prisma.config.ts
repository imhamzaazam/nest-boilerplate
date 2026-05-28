import { defineConfig } from 'prisma/config';

const datasourceUrl =
  process.env.DATABASE_URL ??
  'postgresql://prisma:topsecret@localhost:5433/godelivery?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: datasourceUrl,
  },
});
