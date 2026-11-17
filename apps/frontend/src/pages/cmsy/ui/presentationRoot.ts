import { createContext, useContext } from "react";
export const PresentationRootContext = createContext<HTMLElement | null>(null);
export const usePresentationRoot = () => useContext(PresentationRootContext);
