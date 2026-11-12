import { createFileRoute, redirect } from "@tanstack/react-router";

// Tracking fue reemplazado por las páginas Activación y Retención.
export const Route = createFileRoute("/dashboard/tracking")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/activacion" });
  },
});
