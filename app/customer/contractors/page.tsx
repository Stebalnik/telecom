"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerContractorsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customer/contractors/all");
  }, [router]);

  return null;
}