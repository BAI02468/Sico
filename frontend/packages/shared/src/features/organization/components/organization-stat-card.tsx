import type * as React from "react";

export function OrganizationStatCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section
      aria-label={title}
      className="bg-surface-basic shadow-m flex min-h-32 flex-col rounded-2xl p-5"
    >
      <div className="text-foreground-primary flex items-center gap-2 text-lg font-medium">
        <span className="bg-surface-icon-tile text-foreground-secondary flex size-10 items-center justify-center rounded-lg [&_svg]:size-5">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-2 flex items-baseline gap-2">{children}</div>
    </section>
  );
}
