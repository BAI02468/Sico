import { type ReactNode } from "react";

export type NotificationCardAction =
  | { kind: "card"; onClick: () => void }
  | { kind: "none" };

export type NotificationCardView = {
  leading: ReactNode;
  title: string;
  body: string;
  action: NotificationCardAction;
};
