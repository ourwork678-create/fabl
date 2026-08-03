"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { unwrap, type ActionResult } from "@/lib/action-result";

export function DeleteButton({
  action,
  label = "মুছুন",
  confirmText = "নিশ্চিতভাবে মুছবেন?",
}: {
  action: () => Promise<ActionResult<void>>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  const [clicks, setClicks] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onClick() {
    if (clicks === 0) {
      setClicks(1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setClicks(0), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    start(async () => {
      try {
        unwrap(await action());
      } catch (err: any) {
        alert(err.message);
      } finally {
        setClicks(0);
      }
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50"
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Trash2 size={12} />
      )}
      {clicks === 1 ? "নিশ্চিত?" : label}
    </button>
  );
}
