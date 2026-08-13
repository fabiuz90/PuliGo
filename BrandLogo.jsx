

import { Image } from "@/image";

export const CLEANPLAN_LOGO = "/puligo-icon.png";

export default function BrandLogo({ className = "w-10 h-10", rounded = "rounded-xl" }) {
  return <Image src={CLEANPLAN_LOGO} alt="PuliGo" className={`${rounded} ${className}`} fittingType="fill" />;
}