import { createFileRoute } from "@tanstack/react-router";
import { LullabyApp } from "@/components/lullaby-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LullabyApp />;
}
