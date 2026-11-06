import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
  composeRenderProps,
  type TabsProps,
  type TabListProps,
  type TabProps,
  type TabPanelProps,
} from "react-aria-components";
import styles from "../../../styles/aria/tabs/Tabs.module.css";
export default function Tabs({ className, ...props }: TabsProps) {
  return (
    <AriaTabs
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${styles.tabs} ${value ?? ""}`,
      )}
    />
  );
}
export function TabList<T extends object>({
  className,
  ...props
}: TabListProps<T>) {
  return (
    <AriaTabList
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${styles.list} ${value ?? ""}`,
      )}
    />
  );
}
export function Tab({ className, ...props }: TabProps) {
  return (
    <AriaTab
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${styles.tab} ${value ?? ""}`,
      )}
    />
  );
}
export function TabPanel({ className, ...props }: TabPanelProps) {
  return (
    <AriaTabPanel
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${styles.panel} ${value ?? ""}`,
      )}
    />
  );
}
