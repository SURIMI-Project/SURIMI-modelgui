import { useState } from "react";
import Modal from "../../components/ui/Modal/Modal";
import Button from "../../components/ui/Button/Button";
import Select from "../../components/ui/Select/Select";
import RadioGroup, { Radio } from "../../components/ui/RadioGroup/RadioGroup";
import type { CreateSimulationModalConfig, CreateSimulationModalProps } from "./types";
import styles from "./CreateSimulationModal.module.css";

type Props = CreateSimulationModalProps & { config: CreateSimulationModalConfig };

function SimulationForm({ config, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState(config.speciesInputs[0]?.ID ?? "");
  const [years, setYears] = useState("");
  const [climate, setClimate] = useState("");
  const Inputs = config.StepOneComponent;
  const needsClimate = Number(years) > 10;
  const canContinue = step === 0 || (years !== "" && (!needsClimate || climate !== ""));
  const selectedSpecies = config.speciesInputs.find(item => item.ID === species);
  return <div className={styles.root}>
    <ol className={styles.progress} aria-label="Simulation setup progress">
      {["Configure inputs", "Run settings", "Review"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}
    </ol>
    <div className={styles.heading}><p className={styles.eyebrow}>Simulation setup · Step {step + 1} of 3</p><h2>{step === 0 ? config.steps[0].title : step === 1 ? "Choose run settings" : "Review your simulation"}</h2><p>{step === 0 ? config.steps[0].subtitle : step === 1 ? "Set the simulation duration and climate assumptions." : "Check your choices before completing this demonstration."}</p></div>
    <div hidden={step !== 0}>
      <Select label="Species" selectedKey={species} options={config.speciesInputs.map(item => ({value: item.ID, label: item.LABEL}))} onSelectionChange={key => { if (key) setSpecies(String(key)); }} />
      <div className={styles.inputs}><Inputs direction={1} activeSpeciesId={species} onChangeActiveSpecies={setSpecies} speciesInputs={config.speciesInputs} /></div>
    </div>{step === 1 ? <div className={styles.settings}>
      <RadioGroup label="Run duration" value={years} onChange={value => { setYears(value); setClimate(""); }}>
        {config.yearOptions.map(option => <Radio key={option.value} value={option.value}><span><strong>{option.title}</strong>{option.description ? <small>{option.description}</small> : null}</span></Radio>)}
      </RadioGroup>
      {needsClimate ? <RadioGroup label="IPCC scenario" aria-description={config.ipccDescription} value={climate} onChange={setClimate}>
        {config.ipccOptions.map(option => <Radio key={option.value} value={option.value}><span><strong>{option.title}</strong>{option.description ? <small>{option.description}</small> : null}</span></Radio>)}
      </RadioGroup> : null}
    </div> : step === 2 ? <dl className={styles.review}><div><dt>Species</dt><dd>{selectedSpecies?.LABEL}</dd></div><div><dt>Duration</dt><dd>{years} years</dd></div><div><dt>Climate scenario</dt><dd>{needsClimate ? config.ipccOptions.find(item => item.value === climate)?.title : "Not required for this duration"}</dd></div><div><dt>Harvest control</dt><dd>Configured HCR curve</dd></div></dl> : null}
    <p className={styles.notice}>Demo mode. Completing setup does not submit or save a simulation.</p>
    <footer className={styles.footer}><Button variant="primary-outlined" onPress={() => step === 0 ? onClose() : setStep(step - 1)}>{step === 0 ? "Cancel" : "Back"}</Button><Button variant="primary" isDisabled={!canContinue} onPress={() => {
      if (step < 2) { setStep(step + 1); return; }
      onComplete?.({ speciesId: species, speciesLabel: selectedSpecies?.LABEL ?? species, durationYears: Number(years), ipccScenario: needsClimate ? climate : null, harvestControlProfile: "Configured HCR curve" });
      onClose();
    }}>{step === 2 ? "Complete demo setup" : "Continue"}</Button></footer>
  </div>;
}
export default function CreateSimulationModal(props: Props) {
  return <Modal opened={props.isOpen} onClose={props.onClose} title={props.config.modalTitle} size="min(1100px, 96vw)" closeOnClickOutside={false}>{props.isOpen ? <SimulationForm {...props} /> : null}</Modal>;
}
