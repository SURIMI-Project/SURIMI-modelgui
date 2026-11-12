const caseStudies: Record<string, string> = {
  "northwestern-mediterranean-sea": "Northwestern Mediterranean Sea",
  "aegean-sea": "Aegean Sea",
  "anchovy-bay": "Anchovy Bay",
};

const fishSpecies = [
  { code: "ALB", name: "Albacore", scientificName: "Thunnus alalunga" },
  { code: "AMB", name: "Greater amberjack", scientificName: "Seriola dumerili" },
  { code: "ANE", name: "European anchovy", scientificName: "Engraulis encrasicolus" },
  { code: "HKE", name: "European hake", scientificName: "Merluccius merluccius" },
  { code: "HOM", name: "Atlantic horse mackerel", scientificName: "Trachurus trachurus" },
];

// Allow only supported selections. Bare or invalid URLs retain the default demo.
export const resolveDashboardSelection = (params: URLSearchParams) => ({
  caseStudy: Object.hasOwn(caseStudies, params.get("caseStudy") ?? "")
    ? caseStudies[params.get("caseStudy")!]
    : caseStudies["northwestern-mediterranean-sea"],
  fish: fishSpecies.find((fish) => fish.code === params.get("fish")) ?? fishSpecies[3],
});
