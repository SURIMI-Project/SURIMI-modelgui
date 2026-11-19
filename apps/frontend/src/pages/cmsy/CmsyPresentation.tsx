import { useLayoutEffect, useState, type ReactNode } from "react";
import { PresentationRootContext } from "./ui/presentationRoot";
import "./theme/tokens.css";
import "./theme/presentation.css";

export default function CmsyPresentation({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previous = html.getAttribute("data-cmsy-page");
    html.setAttribute("data-cmsy-page", "true");
    return () => {
      if (previous === null) html.removeAttribute("data-cmsy-page");
      else html.setAttribute("data-cmsy-page", previous);
    };
  }, []);
  return <div ref={setRoot} data-cmsy-presentation>
    <PresentationRootContext.Provider value={root}>{children}</PresentationRootContext.Provider>
  </div>;
}
