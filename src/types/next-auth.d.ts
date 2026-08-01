import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "MANAGER" | "ACCOUNTANT" | "OPERATOR";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "MANAGER" | "ACCOUNTANT" | "OPERATOR";
  }
}
