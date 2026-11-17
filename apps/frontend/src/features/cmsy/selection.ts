import { normalizeSimulationCaseId, simulationCaseStudies } from "../../data/simulationCases";

export const cmsyCases = simulationCaseStudies.map(study => ({
  id: study.id, name: study.seaName,
  image: `/sidemenu/${study.id === "aegean-sea" ? "aegeanItem" : study.id === "anchovy-bay" ? "anchovyItem" : "northwesternseaItem"}.jpg`,
}));
export const cmsySpecies = [
  { value: "ALB", label: "Albacore (ALB)", name: "Albacore", scientificName: "Thunnus alalunga" },
  { value: "AMB", label: "Greater amberjack (AMB)", name: "Greater amberjack", scientificName: "Seriola dumerili" },
  { value: "ANE", label: "European anchovy (ANE)", name: "European anchovy", scientificName: "Engraulis encrasicolus" },
  { value: "HKE", label: "European hake (HKE)", name: "European hake", scientificName: "Merluccius merluccius" },
  { value: "HOM", label: "Atlantic horse mackerel (HOM)", name: "Atlantic horse mackerel", scientificName: "Trachurus trachurus" },
];
export function resolveCmsySelection(params: URLSearchParams) {
  const requestedCase = params.get("caseStudy") ?? "northwestern-mediterranean";
  const caseId = normalizeSimulationCaseId(requestedCase === "northwestern-mediterranean-sea" ? "northwestern-mediterranean" : requestedCase);
  const study = cmsyCases.find(item => item.id === caseId);
  const fish = cmsySpecies.find(item => item.value === (params.get("fish") ?? "HKE"));
  return study && fish ? { study, fish } : null;
}
