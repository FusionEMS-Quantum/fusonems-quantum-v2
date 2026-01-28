import { useState } from "react";

export default function ProtocolImportWidget({ onUpload }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus("");
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("protocol", file);
    try {
      const res = await fetch("/api/admin/protocols/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (res.ok) {
        setStatus("Upload successful!");
        if (onUpload) onUpload();
      } else {
        setStatus("Upload failed.");
      }
    } catch (err) {
      setStatus("Error uploading file.");
    }
  };

  return (
    <div className="protocol-import-widget">
      <h3>Import Protocol</h3>
      <input type="file" accept=".pdf,.docx,.json,.xml" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file}>Upload</button>
      <div>{status}</div>
    </div>
  );
}
