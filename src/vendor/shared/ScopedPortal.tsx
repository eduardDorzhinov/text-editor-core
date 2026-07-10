import {
  type FC,
  type Key,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { SCOPE_WEBCOM_CLASS } from "./global-constants";
import { usePortalScopeClass } from "./PortalScopeContext";

type Props = {
  children: ReactNode,
  container?: Element,
  key?: Key,
};

export const ScopedPortal: FC<Props> = ({
  children,
  container = document.body,
}) => {
  const contextScopeClass = usePortalScopeClass();
  const scopeClass = (SCOPE_WEBCOM_CLASS as string | null) ?? contextScopeClass;

  const content = scopeClass ?
    <div className={scopeClass}>{children}</div> :
    <>{children}</>;

  return createPortal(content, container);
};
