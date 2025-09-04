import { ApiReference } from "@scalar/nextjs-api-reference";

const config: object = {
  spec: { url: "/openapi.json" },
};

export const GET = ApiReference(config);