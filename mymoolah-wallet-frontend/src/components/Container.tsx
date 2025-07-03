import { ReactNode } from "react";

export default function Container({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md md:max-w-lg mx-auto px-4 min-h-screen flex flex-col">
      {children}
    </div>
  );
}
