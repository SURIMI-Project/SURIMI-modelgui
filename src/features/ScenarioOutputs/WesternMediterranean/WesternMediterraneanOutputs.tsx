import AnchovyBayOutputs from "../AnchovyBay/AnchovyBayOutputs";
import {
  WEST_MEDITERRANEAN_FUNCTIONAL_GROUP_OPTIONS,
  WEST_MEDITERRANEAN_SPECIES_MAP,
} from "../../../constants/westMediterraneanTaxonomy";

const WesternMediterraneanOutputs = () => {
  return (
    <AnchovyBayOutputs
      caseId="northwestern-mediterranean"
      defaultTitle="Northwestern Mediterranean Scenario Outputs"
      defaultSubtitle="Dashboard of Scenario Outputs showcasing biomass, landings and discards as well as market indicators for the selected period."
      mapSubtitle="Northwestern Mediterranean hotspot intensity for the selected year and species."
      speciesPresentationByKey={WEST_MEDITERRANEAN_SPECIES_MAP}
      functionalGroupOptions={[...WEST_MEDITERRANEAN_FUNCTIONAL_GROUP_OPTIONS]}
    />
  );
};

export default WesternMediterraneanOutputs;
