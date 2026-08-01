"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reports");
  }, [router]);

  return (
    <div className="flex items-center justify-center p-12 text-sm text-gray-500">
      রিডাইরেক্ট করা হচ্ছে...
    </div>
  );
}
