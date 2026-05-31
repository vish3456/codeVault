// apps/api/src/types/express.d.ts

import "express";

declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
      validatedHeaders?: any;
      auth?: { userId: string };
    }
  }
}
