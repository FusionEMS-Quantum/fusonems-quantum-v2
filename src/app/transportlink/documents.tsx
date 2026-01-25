// Facesheet upload + scanning
// RBAC: Facility only
import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute.jsx';
import { FACILITY_ROLES } from './facilityRoles';
// TODO: Import DocumentUploader, OCRPreview

const Documents = () => {
  // TODO: Drag-drop upload, camera scan, OCR preview, link to ePCR
  return (
    <ProtectedRoute allowedRoles={FACILITY_ROLES}>
      <div>
        <h1>Upload Facesheet & Documents</h1>
        {/* <DocumentUploader /> */}
        {/* <OCRPreview /> */}
        {/* TODO: Integrate with Ollama OCR backend */}
        {/* TODO: Link extracted data to patient ePCR */}
        {/* TODO: Upload to backend transport API */}
      </div>
    </ProtectedRoute>
  );
};

export default Documents;
