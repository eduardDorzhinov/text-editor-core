import { Key, ReactNode } from "react";
import { createPortal } from "react-dom";

import { SCOPE_WEBCOM_CLASS } from "./global-constants";
import { usePortalScopeClass } from "./PortalScopeContext";

export const useScopedPortal = () => {
  const contextScopeClass = usePortalScopeClass();
  const scopeClass = (SCOPE_WEBCOM_CLASS as string | null) ?? contextScopeClass;

  return (
    children: ReactNode,
    container: Element = document.body,
    key?: Key,
  ) => {
    const content = scopeClass ?
      <div className={scopeClass}>{children}</div> :
      <>{children}</>;

    return createPortal(
      content, container, key,
    );
  };
};
