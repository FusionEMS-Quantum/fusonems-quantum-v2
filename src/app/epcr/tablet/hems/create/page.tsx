"use client";

import { UniversalEpcrForm } from "@/lib/epcr/form-renderer";
import { hemsSchema } from "@/lib/epcr/form-schema";
import { useRouter } from "next/navigation";

export default function HemsEpcrCreatePage() {
  const router = useRouter();

  return (
    <UniversalEpcrForm
      schema={hemsSchema}
      onCancel={() => router.back()}
      onSubmit={async (data) => {
        console.log("Submitting HEMS ePCR:", data);
        router.push("/epcr/tablet/hems");
      }}
    />
  );
}
