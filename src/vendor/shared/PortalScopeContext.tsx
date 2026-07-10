"use client";
import { createContext, useContext } from "react";

export const PortalScopeContext = createContext<string | null>(null);
export const usePortalScopeClass = () => useContext(PortalScopeContext);
