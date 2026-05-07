import type { SVGProps } from "react";

export function SproutMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label="smiling sprout character" {...props}>
      <path
        d="M76 52c-18-17-39-19-52-8 3 20 20 31 47 29"
        fill="var(--color-character-leaf)"
        stroke="var(--color-character-ink)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M84 52c15-20 36-25 52-16-1 22-18 35-48 36"
        fill="var(--color-character-leaf)"
        stroke="var(--color-character-ink)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M80 55c2 11 2 20 0 30"
        fill="none"
        stroke="var(--color-character-leaf-dark)"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M42 94c0-26 16-45 38-45s38 19 38 45c0 24-15 43-38 43s-38-19-38-43Z"
        fill="var(--color-character-body)"
        stroke="var(--color-character-ink)"
        strokeWidth="4"
      />
      <path
        d="M54 105c6 13 15 20 30 20 11 0 20-5 27-15-5 17-16 27-32 27-15 0-26-9-31-24Z"
        fill="var(--color-character-body-shade)"
        opacity="0.7"
      />
      <circle cx="65" cy="94" r="4" fill="var(--color-character-ink)" />
      <circle cx="95" cy="94" r="4" fill="var(--color-character-ink)" />
      <path
        d="M70 109c6 5 14 5 20 0"
        fill="none"
        stroke="var(--color-character-ink)"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle cx="55" cy="104" r="6" fill="var(--color-character-blush)" opacity="0.65" />
      <circle cx="105" cy="104" r="6" fill="var(--color-character-blush)" opacity="0.65" />
    </svg>
  );
}
