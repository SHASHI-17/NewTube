import { HydrateClient, trpc } from "@/trpc/server";
import Client from "./client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
export default async function Home() {
  void trpc.hello.prefetch({ text: " Shashi!" });
  return (
    <HydrateClient>
      <Suspense fallback={<p>Loading...</p>}>
        <ErrorBoundary fallback={<p>Error occurred</p>}>
          <Client />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
}
