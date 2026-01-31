import { ReactNode } from "react";

declare function ProtectedRoute(props: {
  children: ReactNode;
  allowedRoles?: string[];
}): JSX.Element;

export default ProtectedRoute;
