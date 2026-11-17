import type { ReactNode } from "react";
import { Dialog, DialogTrigger } from "react-aria-components";
import ChartCard from "../../../components/presentational/ChartCard/ChartCard";
import Button from "../../../components/ui/Button/Button";
import Popover from "../../../components/ui/Popover/Popover";
import styles from "../Cmsy.module.css";

type Props = { title: string; subtitle: string; hints: string[]; children: ReactNode };
export default function InsightChartCard({ title, subtitle, hints, children }: Props) {
  return <ChartCard title={title} description={subtitle} aside={<DialogTrigger>
    <Button variant="ghost" size="sm">HOW TO READ</Button>
    <Popover><Dialog aria-label={`How to read ${title}`}><ul className={styles.hints}>
      {hints.map(hint => <li key={hint}>{hint}</li>)}
    </ul></Dialog></Popover>
  </DialogTrigger>}><div className={styles.chart}>{children}</div></ChartCard>;
}
