"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { FACILITY_ROLES } from "../facilityRoles";
import { extractUpload, applyDoc, type ExtractResponse } from "../documentApi";

const ABDForm = () => {
  const [tripId, setTripId] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setExtractResult(null);
      setEditableFields({});
      setMessage(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await extractUpload(tripId, "ABD", file);
      setExtractResult(result);
      setEditableFields({ ...result.extracted_fields });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Extract failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!extractResult) return;
    if (!accepted) {
      setMessage({ type: "err", text: "Please accept the notice and sign." });
      return;
    }
    setApplyLoading(true);
    setMessage(null);
    try {
      await applyDoc(tripId, "ABD", {
        snapshot_id: extractResult.snapshot_id,
        accepted_fields: { ...editableFields, signature, accepted: true },
        overrides: {},
      });
      setMessage({ type: "ok", text: "ABD applied to trip." });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Apply failed" });
    } finally {
      setApplyLoading(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setEditableFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ProtectedRoute allowedRoles={FACILITY_ROLES}>
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-orange-400">Advance Beneficiary Notice (ABD)</h1>
            <p className="text-zinc-400 mt-1">Upload ABD document, confirm acceptance, and apply to trip.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
            <label className="block text-sm font-medium text-zinc-400">Trip ID</label>
            <input
              type="number"
              min={1}
              value={tripId}
              onChange={(e) => setTripId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
            />
          </div>

          <div className="rounded-xl border border-dashed border-zinc-600 bg-white/5 p-8 text-center">
            <input type="file" accept=".pdf,.txt,image/*" onChange={handleFileChange} className="hidden" id="abd-file" />
            <label htmlFor="abd-file" className="cursor-pointer block">
              <span className="text-zinc-400">Drop ABD file here or click to browse</span>
              {file && <p className="text-orange-400 mt-2 font-medium">{file.name}</p>}
            </label>
            <button
              type="button"
              onClick={handleExtract}
              disabled={!file || loading}
              className="mt-4 px-6 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Extracting…" : "Extract"}
            </button>
          </div>

          {extractResult && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Extracted fields</h2>
              {Object.entries(editableFields).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm text-zinc-400 mb-1">{key.replace(/_/g, " ")}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="abd-accept"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-orange-500"
                />
                <label htmlFor="abd-accept" className="text-zinc-300">I have read and accept the Advance Beneficiary Notice.</label>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Patient / representative signature</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>
              <button
                type="button"
                onClick={handleApply}
                disabled={applyLoading || !accepted || !signature.trim()}
                className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applyLoading ? "Applying…" : "Apply to trip"}
              </button>
            </div>
          )}

          {message && (
            <p className={message.type === "ok" ? "text-green-400" : "text-red-400"}>{message.text}</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ABDForm;
