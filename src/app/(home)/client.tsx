
"use client";

import { trpc } from "@/trpc/client";

export default function Client() {

const [data]=trpc.hello.useSuspenseQuery({ text: "Shashi" });

  return (
    <>
    <p>Client Component says : {data.greeting}</p>
    </>
  );
}