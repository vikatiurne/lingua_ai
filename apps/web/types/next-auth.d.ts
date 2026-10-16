import type { DefaultSession } from "next-auth";
import type { CEFRLevel } from "@lingua/shared";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      level: CEFRLevel | null;
      targetLevel: CEFRLevel | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    level?: CEFRLevel | null;
    targetLevel?: CEFRLevel | null;
  }
}
