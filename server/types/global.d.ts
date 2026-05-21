// Express Request augmentation for req.user (populated by requireAuth middleware).
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        provider?: string;
        email?: string;
        name?: string;
      };
    }
  }
  // Next.js extends fetch with `cache` / `next` options. src/lib/* may use them.
  // Outside Next they're harmless (ignored at runtime); declare them so tsc passes.
  interface RequestInit {
    cache?: string;
    next?: { revalidate?: number | false; tags?: string[] };
  }
}

export {};
