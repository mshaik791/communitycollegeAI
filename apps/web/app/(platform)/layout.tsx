import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-5 py-8">
        {children}
      </main>
    </div>
  );
}
