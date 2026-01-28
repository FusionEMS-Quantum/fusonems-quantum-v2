"use client";

import { UniversalEpcrForm } from "@/lib/epcr/form-renderer";
import { emsSchema } from "@/lib/epcr/form-schema";
import { useRouter } from "next/navigation";

export default function EmsEpcrCreatePage() {
  const router = useRouter();

  return (
    <UniversalEpcrForm
      schema={emsSchema}
      onCancel={() => router.back()}
      onSubmit={async (data) => {
        console.log("Submitting EMS ePCR:", data);
        router.push("/epcr/tablet/ems");
      }}
    />
  );
}
