import { cn } from "@/lib/utils";

export function DoodlePattern({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={id}
          width="280"
          height="280"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-4)"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g transform="translate(28 34) rotate(-14)">
              <text
                x="0"
                y="0"
                fontSize="30"
                fontWeight="700"
                fill="currentColor"
                stroke="none"
                className="font-display"
              >
                ?
              </text>
            </g>

            <g transform="translate(196 30) rotate(12)">
              <text
                x="0"
                y="0"
                fontSize="30"
                fontWeight="700"
                fill="currentColor"
                stroke="none"
                className="font-display"
              >
                !
              </text>
            </g>

            <g transform="translate(108 24) rotate(38)">
              <rect x="0" y="0" width="19" height="11" rx="1.5" />
              <path d="M4.5 0 V11" />
              <path d="M19 0 L27 5.5 L19 11" />
              <path d="M24.5 3.4 L26.4 4.9" />
            </g>

            <g transform="translate(190 128) rotate(-24)">
              <rect x="0" y="1.5" width="22" height="8" rx="1.5" />
              <path d="M14.5 1.5 V9.5" />
              <path d="M22 1.5 L29 5.5 L22 9.5" />
              <path d="M3 1.5 L3 5" />
            </g>

            <g transform="translate(64 150)">
              <path d="M0 -9 C1.5 -3.5 3.5 -1.5 9 0 C3.5 1.5 1.5 3.5 0 9 C-1.5 3.5 -3.5 1.5 -9 0 C-3.5 -1.5 -1.5 -3.5 0 -9 Z" />
            </g>

            <g transform="translate(26 214) rotate(-6)">
              <path d="M0 0 q6 -8 12 0 t12 0 t12 0" />
            </g>

            <g transform="translate(216 224) rotate(16) scale(0.75)">
              <text
                x="0"
                y="0"
                fontSize="30"
                fontWeight="700"
                fill="currentColor"
                stroke="none"
                className="font-display"
              >
                ?
              </text>
            </g>

            <g transform="translate(140 196) rotate(-40)">
              <rect x="0" y="0" width="19" height="11" rx="1.5" />
              <path d="M4.5 0 V11" />
              <path d="M19 0 L27 5.5 L19 11" />
            </g>

            <g transform="translate(246 150) rotate(8)">
              <path d="M0 -9 C1.5 -3.5 3.5 -1.5 9 0 C3.5 1.5 1.5 3.5 0 9 C-1.5 3.5 -3.5 1.5 -9 0 C-3.5 -1.5 -1.5 -3.5 0 -9 Z" />
            </g>

            <g transform="translate(150 92) rotate(10)">
              <path d="M0 0 q6 -8 12 0 t12 0" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
