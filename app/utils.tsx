import { ReactNode } from "react";

// I liked using components in JSX instead of conditional code.
// This is becouse I like maintaining the HTML feel in the code.
// This component is for that reason
const Show = ({ when, children }: { when: boolean; children: ReactNode }) => {
  if (when) return <>{children}</>;
  return <></>;
};

export { Show };
