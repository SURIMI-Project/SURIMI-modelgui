import { Popover, UnstyledButton } from "@mantine/core";
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
    <Popover
      width={384}
      position="bottom-end"
      offset={10}
      withinPortal={false}
      shadow="md"
      classNames={{ dropdown: styles.dropdown }}
    >
      <Popover.Target>
        <UnstyledButton
          className={[styles.trigger, className].filter(Boolean).join(" ")}
          type="button"
          aria-label="Open biomass graph legend"
        >
          <FiInfo aria-hidden="true" />
          <span>{buttonLabel}</span>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown>
        <InformationLegends title={legendsTitle} items={items} />
      </Popover.Dropdown>
    </Popover>
  );
};

export default InformationLegendsPopover;
