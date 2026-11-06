import { DialogTrigger, Dialog } from "react-aria-components";
import Popover from "../../../../components/ui/Popover/Popover";
import Button from "../../../../components/ui/Button/Button";
import { FiInfo } from "react-icons/fi";
import InformationLegends, {
  type InformationLegendItem,
} from "./InformationLegends";
import styles from "./InformationLegendsPopover.module.css";

type InformationLegendsPopoverProps = {
  items: InformationLegendItem[];
  buttonLabel?: string;
  legendsTitle?: string;
  className?: string;
};

const InformationLegendsPopover = ({
  items,
  buttonLabel = "Legend",
  legendsTitle,
  className,
}: InformationLegendsPopoverProps) => {
  return (
    <DialogTrigger>
      <Button
        variant="primary-outlined"
        size="sm"
        className={[styles.trigger, className].filter(Boolean).join(" ")}
        aria-label="Open biomass graph legend"
      >
        <FiInfo aria-hidden="true" />
        <span>{buttonLabel}</span>
      </Button>
      <Popover placement="bottom end" className={styles.dropdown}>
        <Dialog aria-label={legendsTitle ?? "Graph legend"}>
          <InformationLegends title={legendsTitle} items={items} />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
};
export default InformationLegendsPopover;
