import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

const base = "h-4 w-4";

const IconBase = ({
  className,
  children,
}: IconProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? base}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const TrashIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
  </IconBase>
);

export const PlusIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </IconBase>
);

export const XIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </IconBase>
);

export const SendIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </IconBase>
);

export const LogOutIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </IconBase>
);

export const SparkleIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 3l1.8 4.9L19 9.5l-4.9 1.8L12 16l-1.8-4.7L5 9.5l5.2-1.6L12 3z" />
    <path d="M19 15l.9 2.4L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.6z" />
  </IconBase>
);
