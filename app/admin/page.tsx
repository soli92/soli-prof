"use client";

import { useState } from "react";
import { IngestPanel } from "@/components/admin/ingest-panel";
import { SoliLogo } from "@/components/ui/logo-loader";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);

    try {
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAuthorized(true);
      } else if (res.status === 401) {
        setError("Password errata.");
      } else {
        setError(`Errore del server (${res.status}).`);
      }
    } catch (err) {
      setError("Errore di rete.");
    } finally {
      setVerifying(false);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Admin — Soli Prof</h1>
            <SoliLogo className="h-7 w-auto object-contain" alt="Logo Soli Prof" />
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Accesso riservato. Inserisci la password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || password.length === 0}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {verifying ? "Verifico..." : "Entra"}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400">
            La password è verificata server-side. Nessuna credenziale viene
            salvata nel browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Admin — Soli Prof
            </h1>
            <p className="text-sm text-gray-500">
              Gestione knowledge base RAG
            </p>
          </div>
          <SoliLogo className="h-9 w-auto object-contain" alt="Logo Soli Prof" />
          <button
            onClick={() => {
              setAuthorized(false);
              setPassword("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Re-ingest knowledge base
          </h2>
          <IngestPanel />
        </div>
      </div>
    </div>
  );
}
