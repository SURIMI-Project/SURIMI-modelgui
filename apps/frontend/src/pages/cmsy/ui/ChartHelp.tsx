import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { usePresentationRoot } from "./presentationRoot";
import ui from "./Presentation.module.css";

type Props = { title: string; hints: string[]; triggerClassName: string; dropdownClassName: string; listClassName: string };
export default function ChartHelp({ title, hints, triggerClassName, dropdownClassName, listClassName }: Props) {
  const root = usePresentationRoot();
  return <TooltipTrigger delay={120} closeDelay={100}>
    <Button aria-label={`How to read ${title}`} className={`${ui.helpTrigger} ${triggerClassName}`}>How to read</Button>
    <Tooltip placement="bottom end" UNSTABLE_portalContainer={root ?? undefined} className={`${ui.helpDropdown} ${dropdownClassName}`}>
      <ul className={listClassName}>{hints.map(hint => <li key={hint}>{hint}</li>)}</ul>
    </Tooltip>
  </TooltipTrigger>;
}
