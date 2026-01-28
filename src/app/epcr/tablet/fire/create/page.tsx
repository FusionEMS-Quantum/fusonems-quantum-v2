"use client";

import { UniversalEpcrForm } from "@/lib/epcr/form-renderer";
import { fireSchema } from "@/lib/epcr/form-schema";
import { useRouter } from "next/navigation";

export default function FireEpcrCreatePage() {
  const router = useRouter();

  return (
    <UniversalEpcrForm
      schema={fireSchema}
      onCancel={() => router.back()}
      onSubmit={async (data) => {
        console.log("Submitting Fire ePCR:", data);
        router.push("/epcr/tablet/fire");
      }}
    />
  );
}
