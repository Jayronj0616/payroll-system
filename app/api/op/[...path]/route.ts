import { createRouteHandler } from "@openpanel/nextjs/server";

// First-party proxy for OpenPanel, so ad blockers that block the third-party host
// do not drop events. Serves op1.js and forwards /track.
export const { GET, POST } = createRouteHandler();
