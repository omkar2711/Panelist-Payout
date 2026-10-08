import Image from "next/image";
import { ORG_NAME } from "@/lib/brand";

// Pixel sizes of the files in /public/brand (cut from the ExpertBench logo kit).
const LOGOS = {
  // full colour, for white and light-grey surfaces
  color: { src: "/brand/logo.png", width: 901, height: 220 },
  // full colour with the tagline underneath
  tagline: { src: "/brand/logo-tagline.png", width: 983, height: 240 },
  // "Expert" in white, for dark surfaces
  dark: { src: "/brand/logo-dark.png", width: 901, height: 220 },
  // single-colour white with the tagline, for coloured surfaces
  white: { src: "/brand/logo-white.png", width: 983, height: 240 },
} as const;

export function BrandLogo({
  variant = "color",
  className = "h-9",
}: {
  variant?: keyof typeof LOGOS;
  className?: string;
}) {
  const logo = LOGOS[variant];
  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt={ORG_NAME}
      loading="eager"
      className={`w-auto shrink-0 ${className}`}
    />
  );
}

export function BrandSymbol({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <Image
      src="/brand/symbol.png"
      width={512}
      height={512}
      alt={ORG_NAME}
      loading="eager"
      className={`shrink-0 ${className}`}
    />
  );
}
