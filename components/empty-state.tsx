"use client";

import React from "react";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: string;
}

export function EmptyState({
  title = "Benvenuto in Soli Prof",
  subtitle = "Il tuo tutor personale per imparare AI engineering. Inizia con una domanda!",
  icon = "👋",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md px-4">
        {icon && <div className="text-5xl mb-6">{icon}</div>}
        <h1
          className="text-lg font-semibold text-gray-900 mb-3"
          style={{ fontSize: "18px" }}
        >
          {title}
        </h1>
        <p
          className="text-gray-600"
          style={{ fontSize: "14px", lineHeight: "1.625" }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
