import React from "react";

export default function BannerTest() {
  return (
    <div>
      <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white text-center py-4 font-bold">
        This is a red banner!
      </div>
      <div className="pt-20 text-center">
        <p>If you see a RED banner at the top, Tailwind is working.</p>
        <p>If not, Tailwind is NOT working and we need to fix the setup.</p>
      </div>
    </div>
  );
}