// Simple line icons (24px grid, 1.8 stroke) shared across the site.
type P = { size?: number };

function Svg({ size = 26, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconCross = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v18M6.5 8.5h11" />
  </Svg>
);
export const IconNotice = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </Svg>
);
export const IconSermon = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
  </Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);
export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.7 2.7L16 9.8" />
  </Svg>
);
export const IconBox = (p: P) => (
  <Svg {...p}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </Svg>
);
export const IconPeople = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" />
  </Svg>
);
export const IconBank = (p: P) => (
  <Svg {...p}>
    <path d="M3 10 12 4l9 6" />
    <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" />
  </Svg>
);
export const IconHeart = (p: P) => (
  <Svg {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconArrow = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
