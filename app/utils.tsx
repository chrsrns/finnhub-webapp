import { ReactNode } from "react";

// I liked using components in JSX instead of conditional code.
// This is becouse I like maintaining the HTML feel in the code.
// This component is for that reason
const Show = ({ when, children }: { when: boolean; children: ReactNode }) => {
  if (when) return <>{children}</>;
  return <></>;
};

const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export { Show, uuidv4 };
