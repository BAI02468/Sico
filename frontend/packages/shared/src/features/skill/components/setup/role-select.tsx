import { useLingui } from "@lingui/react/macro";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sico/ui";
import { forwardRef, type ReactElement } from "react";

import type { Role } from "../../schemas/roles";

type RoleSelectProps = {
  id?: string;
  value: string;
  options: Role[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  placeholder?: string;
};

// `items` lets Base UI's <SelectValue> resolve the selected option's label
// (role.name) instead of echoing the raw value. `value || null` shows the
// placeholder when no role is chosen (Base UI treats null, not "", as empty).
// `alignItemWithTrigger={false}` anchors the popup below the trigger instead of
// overlaying the selected item on top of it (the native-select default).
export const RoleSelect = forwardRef<HTMLButtonElement, RoleSelectProps>(
  (
    {
      id,
      value,
      options,
      onChange,
      onBlur,
      disabled,
      ariaLabel,
      ariaInvalid,
      ariaRequired,
      placeholder,
    },
    ref,
  ): ReactElement => {
    const { t } = useLingui();
    const items = options.map((role) => ({
      value: role.value,
      label: role.name,
    }));
    return (
      <Select
        items={items}
        value={value || null}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          ref={ref}
          id={id}
          aria-label={
            ariaLabel ??
            t({
              id: "skill.roleSelect.roleAria",
              message: "Industry Type",
            })
          }
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          className="w-full"
          onBlur={onBlur}
        >
          <SelectValue
            placeholder={
              placeholder ??
              t({
                id: "skill.roleSelect.placeholder",
                message: "Select a role...",
              })
            }
          />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
);

RoleSelect.displayName = "RoleSelect";
