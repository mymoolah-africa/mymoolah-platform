import React from "react";
import logo from "../assets/logo.png";

const Logo = () => (
  <div className="flex justify-center mt-16 mb-4">
    <img
      src={logo}
      alt="MyMoolah Logo"
      className="h-12 w-auto max-w-[120px]"
      style={{ objectFit: "contain" }}
    />
  </div>
);

export default Logo;