"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    // Delay slightly to allow rendering to complete
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
