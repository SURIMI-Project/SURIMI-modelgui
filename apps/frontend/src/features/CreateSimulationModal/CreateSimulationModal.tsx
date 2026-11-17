import { useEffect, useRef, useState, type FormEvent } from "react";
import Modal from "../../components/ui/Modal/Modal";
import Button from "../../components/ui/Button/Button";
import Select from "../../components/ui/Select/Select";
import RadioGroup, { Radio } from "../../components/ui/RadioGroup/RadioGroup";
import type { CreateSimulationModalConfig, CreateSimulationModalProps } from "./types";
import styles from "./CreateSimulationModal.module.css";

type Props = CreateSimulationModalProps & { config: CreateSimulationModalConfig };
type Screen = "inputs" | "duration" | "climate";

function SimulationForm({ config, onClose, onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>("inputs");
  const [species, setSpecies] = useState(config.speciesInputs[0]?.ID ?? "");
  const [years, setYears] = useState("");
  const [climate, setClimate] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const Inputs = config.InputsComponent;
  const needsClimate = Number(years) > 10;
  const selectedSpecies = config.speciesInputs.find(item => item.ID === species);
  const validDuration = config.yearOptions.some(option => option.value === years);
  const validClimate = config.ipccOptions.some(option => option.value === climate);
  const canContinue = Boolean(selectedSpecies) && (screen === "inputs" || (validDuration && (screen !== "climate" || validClimate)));
  const isFinal = screen === "climate" || (screen === "duration" && validDuration && !needsClimate);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [screen]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue) return;
    if (screen === "inputs") { setScreen("duration"); return; }
    if (screen === "duration" && needsClimate) { setScreen("climate"); return; }
    onComplete?.({ speciesId: species, speciesLabel: selectedSpecies!.LABEL, durationYears: Number(years), ipccScenario: needsClimate ? climate : "ssp2-4.5", harvestControlProfile: "Configured HCR curve" });
    onClose();
  };
  const title = screen === "inputs" ? "Harvest control input" : screen === "duration" ? "How long would you like to run your simulation for?" : "Select IPCC Scenario";
  return <form className={styles.root} onSubmit={submit}>
    <div ref={body} className={styles.formBody}>
      <div className={styles.headingRow}>
        <div className={styles.heading}>
          <h2 ref={heading} tabIndex={-1}>{title}</h2>
        </div>
        {screen === "inputs" ? <div className={styles.speciesSelect}><Select label="Species" selectedKey={species} options={config.speciesInputs.map(item => ({ value: item.ID, label: item.LABEL }))} onSelectionChange={key => { if (key) setSpecies(String(key)); }} /></div> : null}
      </div>
      <p className={styles.intro}>{screen === "inputs" ? config.stepOneInfo.text : screen === "duration" ? "For 5- or 10-year runs, the simulation automatically uses SSP2-4.5." : "Choose one climate scenario for long-horizon runs (> 10 years)."}</p>
      {/* Keep the editor mounted so Previous retains the edited harvest curve. */}
      <div hidden={screen !== "inputs"}>
        <div className={styles.inputs}><Inputs direction={1} activeSpeciesId={species} onChangeActiveSpecies={setSpecies} speciesInputs={config.speciesInputs} /></div>
      </div>
      {screen === "duration" ? <section className={styles.settings}>
        <p className={styles.hint}>Select one duration to continue.</p>
        <RadioGroup className={styles.optionGroup} label="Run duration" value={years} isRequired onChange={value => { setYears(value); setClimate(""); }}>
          {config.yearOptions.map(option => <Radio key={option.value} value={option.value}><span><strong>{option.title}</strong>{option.description ? <small>{option.description}</small> : null}</span></Radio>)}
        </RadioGroup>
      </section> : null}
      {screen === "climate" ? <section className={styles.settings}>
        <p className={styles.hint}>{config.ipccDescription}</p>
        <RadioGroup className={styles.optionGroup} label="IPCC scenarios" value={climate} isRequired onChange={setClimate}>
          {config.ipccOptions.map(option => <Radio key={option.value} value={option.value}><span>{option.meta ? <span className={styles.optionMeta}>{option.meta}</span> : null}<strong>{option.title}</strong>{option.description ? <small>{option.description}</small> : null}</span></Radio>)}
        </RadioGroup>
      </section> : null}
    </div>
    <footer className={styles.footer}>
      <Button type="button" variant="primary-outlined" onPress={() => screen === "inputs" ? onClose() : setScreen(screen === "climate" ? "duration" : "inputs")}>{screen === "inputs" ? "CANCEL" : "PREVIOUS"}</Button>
      <p className={styles.notice}>Demo mode. Completing setup does not submit or save a simulation.</p>
      <Button type="submit" isDisabled={!canContinue}>{isFinal ? "COMPLETE DEMO SETUP" : "NEXT"}</Button>
    </footer>
  </form>;
}
export default function CreateSimulationModal(props: Props) {
  return <Modal appearance="marine" opened={props.isOpen} onClose={props.onClose} title={props.config.modalTitle} size="var(--layout-setup-max)" bodyClassName={styles.modalBody} closeOnClickOutside={false}>{props.isOpen ? <SimulationForm {...props} /> : null}</Modal>;
}
