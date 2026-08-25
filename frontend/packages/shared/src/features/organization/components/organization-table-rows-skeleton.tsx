import { Skeleton } from "@sico/ui";
import type * as React from "react";

export function OrganizationTableRowsSkeleton({
  columns,
}: {
  columns: 4 | 5;
}): React.JSX.Element {
  const gridColumns = columns === 5 ? "grid-cols-5" : "grid-cols-4";
  return (
    <div
      aria-hidden="true"
      data-testid="organization-table-rows-skeleton"
      data-columns={columns}
      className="flex flex-1 flex-col"
    >
      <div className={`grid h-13 items-center gap-4 px-6 ${gridColumns}`}>
        {Array.from({ length: columns }, (_header, headerIndex) => (
          // eslint-disable-next-line react/no-array-index-key -- static placeholder columns
          <Skeleton key={headerIndex} className="h-4 w-20" />
        ))}
      </div>
      {Array.from({ length: 6 }, (_row, rowIndex) => (
        <div
          // eslint-disable-next-line react/no-array-index-key -- static placeholder rows
          key={rowIndex}
          className={`grid h-14 items-center gap-4 px-6 ${gridColumns}`}
        >
          {Array.from({ length: columns }, (_column, columnIndex) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key -- static placeholder cells
              key={columnIndex}
              className="h-4 w-24"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
