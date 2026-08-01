import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/guard";

export default async function Home() {
  const session = await getValidSession();
  redirect(session ? "/dashboard" : "/login");
}
