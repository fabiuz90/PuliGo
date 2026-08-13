

import { Image } from "@/ui/image";

export const CLEANPLAN_LOGO =
  "https://media.db.com/images/public/6a7a4c2b1ee07a9df8e05052/c3ae44728_1fab1a1f-26ea-40c2-8536-ceafc55ebb98.png";

export default function BrandLogo({ className = "w-10 h-10", rounded = "rounded-xl" }) {
  return <Image src={CLEANPLAN_LOGO} alt="PuliGo" className={`${rounded} ${className}`} fittingType="fill" />;
}