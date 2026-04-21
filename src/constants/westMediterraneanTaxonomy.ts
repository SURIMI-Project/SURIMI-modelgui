export type WestMediterraneanSpeciesEntry = {
  stockCode: string;
  displayName: string;
  scientificName: string;
  functionalGroupKey: string;
  functionalGroupName: string;
};

export type WestMediterraneanFunctionalGroupMember = {
  speciesKey: string;
  stockCode: string;
  displayName: string;
  scientificName: string;
};

export type WestMediterraneanFunctionalGroupEntry = {
  displayName: string;
  species: readonly WestMediterraneanFunctionalGroupMember[];
};

// Temporary shared taxonomy for all dashboards until scenario-specific mapper
// files are provided. Keep the West Mediterranean naming for now so it is easy
// to replace later with dedicated per-scenario datasets.
export const WEST_MEDITERRANEAN_SPECIES_MAP = {
  alb: {
    stockCode: "ALB",
    displayName: "Albacore",
    scientificName: "Thunnus alalunga",
    functionalGroupKey: "large_pelagic_fishes",
    functionalGroupName: "Large pelagic fishes",
  },
  ane: {
    stockCode: "ANE",
    displayName: "European anchovy",
    scientificName: "Engraulis encrasicolus",
    functionalGroupKey: "small_pelagic_fishes",
    functionalGroupName: "Small pelagic fishes",
  },
  ank: {
    stockCode: "ANK",
    displayName: "Blackbellied angler",
    scientificName: "Lophius budegassa",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  ara: {
    stockCode: "ARA",
    displayName: "Blue and red shrimp",
    scientificName: "Aristeus antennatus",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  bft: {
    stockCode: "BFT",
    displayName: "Atlantic bluefin tuna",
    scientificName: "Thunnus thynnus",
    functionalGroupKey: "large_pelagic_fishes",
    functionalGroupName: "Large pelagic fishes",
  },
  bib: {
    stockCode: "BIB",
    displayName: "Pouting(=Bib)",
    scientificName: "Trisopterus luscus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
  },
  bll: {
    stockCode: "BLL",
    displayName: "Brill",
    scientificName: "Scophthalmus rhombus",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  bog: {
    stockCode: "BOG",
    displayName: "Bogue",
    scientificName: "Boops boops",
    functionalGroupKey: "small_demersal_fishes",
    functionalGroupName: "Small demersal fishes",
  },
  bon: {
    stockCode: "BON",
    displayName: "Atlantic bonito",
    scientificName: "Sarda sarda",
    functionalGroupKey: "large_pelagic_fishes",
    functionalGroupName: "Large pelagic fishes",
  },
  boy: {
    stockCode: "BOY",
    displayName: "Purple dye murex",
    scientificName: "Bolinus brandaris",
    functionalGroupKey: "other_invertebrates",
    functionalGroupName: "Other invertebrates",
  },
  brf: {
    stockCode: "BRF",
    displayName: "Blackbelly rosefish",
    scientificName: "Helicolenus dactylopterus",
    functionalGroupKey: "medium_demersal_fishes",
    functionalGroupName: "Medium demersal fishes",
  },
  bsh: {
    stockCode: "BSH",
    displayName: "Blue shark",
    scientificName: "Prionace glauca",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  cil: {
    stockCode: "CIL",
    displayName: "Spotted flounder",
    scientificName: "Citharus linguatula",
    functionalGroupKey: "medium_demersal_fishes",
    functionalGroupName: "Medium demersal fishes",
  },
  coe: {
    stockCode: "COE",
    displayName: "European conger",
    scientificName: "Conger conger",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  eoi: {
    stockCode: "EOI",
    displayName: "Horned octopus",
    scientificName: "Eledone cirrhosa",
    functionalGroupKey: "cephalopods",
    functionalGroupName: "Cephalopods",
  },
  grq: {
    stockCode: "GRQ",
    displayName: "Mediterranean geryon",
    scientificName: "Geryon longipes",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  hke: {
    stockCode: "HKE",
    displayName: "European hake",
    scientificName: "Merluccius merluccius",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  hmm: {
    stockCode: "HMM",
    displayName: "Mediterranean horse mackerel",
    scientificName: "Trachurus mediterraneus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
  },
  hom: {
    stockCode: "HOM",
    displayName: "Atlantic horse mackerel",
    scientificName: "Trachurus trachurus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
  },
  jaa: {
    stockCode: "JAA",
    displayName: "Blue jack mackerel",
    scientificName: "Trachurus picturatus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
  },
  jdp: {
    stockCode: "JDP",
    displayName: "Common stingray",
    scientificName: "Dasyatis pastinaca",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  jrs: {
    stockCode: "JRS",
    displayName: "Mediterranean starry ray",
    scientificName: "Raja asterias",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  ldb: {
    stockCode: "LDB",
    displayName: "Four-spot megrim",
    scientificName: "Lepidorhombus boscii",
    functionalGroupKey: "small_demersal_fishes",
    functionalGroupName: "Small demersal fishes",
  },
  ldv: {
    stockCode: "LDV",
    displayName: "Large-scaled gurnard",
    scientificName: "Lepidotrigla cavillone",
    functionalGroupKey: "small_demersal_fishes",
    functionalGroupName: "Small demersal fishes",
  },
  lko: {
    stockCode: "LKO",
    displayName: "Arrow shrimp",
    scientificName: "Plesionika heterocarpus",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  lkt: {
    stockCode: "LKT",
    displayName: "Golden shrimp",
    scientificName: "Plesionika martia",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  mac: {
    stockCode: "MAC",
    displayName: "Atlantic mackerel",
    scientificName: "Scomber scombrus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
  },
  mon: {
    stockCode: "MON",
    displayName: "Angler(=Monk)",
    scientificName: "Lophius piscatorius",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  mts: {
    stockCode: "MTS",
    displayName: "Spottail mantis squillid",
    scientificName: "Squilla mantis",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  mut: {
    stockCode: "MUT",
    displayName: "Red mullet",
    scientificName: "Mullus barbatus",
    functionalGroupKey: "medium_demersal_fishes",
    functionalGroupName: "Medium demersal fishes",
  },
  nep: {
    stockCode: "NEP",
    displayName: "Norway lobster",
    scientificName: "Nephrops norvegicus",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  occ: {
    stockCode: "OCC",
    displayName: "Common octopus",
    scientificName: "Octopus vulgaris",
    functionalGroupKey: "cephalopods",
    functionalGroupName: "Cephalopods",
  },
  olv: {
    stockCode: "OLV",
    displayName: "Paromola",
    scientificName: "Paromola cuvieri",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
  },
  pac: {
    stockCode: "PAC",
    displayName: "Common pandora",
    scientificName: "Pagellus erythrinus",
    functionalGroupKey: "medium_demersal_fishes",
    functionalGroupName: "Medium demersal fishes",
  },
  pil: {
    stockCode: "PIL",
    displayName: "European pilchard(=Sardine)",
    scientificName: "Sardina pilchardus",
    functionalGroupKey: "small_pelagic_fishes",
    functionalGroupName: "Small pelagic fishes",
  },
  pod: {
    stockCode: "POD",
    displayName: "Poor cod",
    scientificName: "Trisopterus minutus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
  },
  saa: {
    stockCode: "SAA",
    displayName: "Round sardinella",
    scientificName: "Sardinella aurita",
    functionalGroupKey: "small_pelagic_fishes",
    functionalGroupName: "Small pelagic fishes",
  },
  sba: {
    stockCode: "SBA",
    displayName: "Axillary seabream",
    scientificName: "Pagellus acarne",
    functionalGroupKey: "medium_demersal_fishes",
    functionalGroupName: "Medium demersal fishes",
  },
  sfs: {
    stockCode: "SFS",
    displayName: "Silver scabbardfish",
    scientificName: "Lepidopus caudatus",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  sho: {
    stockCode: "SHO",
    displayName: "Blackmouth catshark",
    scientificName: "Galeus melastomus",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  soo: {
    stockCode: "SOO",
    displayName: "[Solea spp]",
    scientificName: "Solea spp",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  spc: {
    stockCode: "SPC",
    displayName: "Picarel",
    scientificName: "Spicara smaris",
    functionalGroupKey: "small_pelagic_fishes",
    functionalGroupName: "Small pelagic fishes",
  },
  sqe: {
    stockCode: "SQE",
    displayName: "European flying squid",
    scientificName: "Todarodes sagittatus",
    functionalGroupKey: "cephalopods",
    functionalGroupName: "Cephalopods",
  },
  sqm: {
    stockCode: "SQM",
    displayName: "Broadtail shortfin squid",
    scientificName: "Illex coindetii",
    functionalGroupKey: "cephalopods",
    functionalGroupName: "Cephalopods",
  },
  srg: {
    stockCode: "SRG",
    displayName: "Sargo breams nei",
    scientificName: "Diplodus spp",
    functionalGroupKey: "medium_demersal_fishes",
    functionalGroupName: "Medium demersal fishes",
  },
  srj: {
    stockCode: "SRJ",
    displayName: "Brown comber",
    scientificName: "Serranus hepatus",
    functionalGroupKey: "small_demersal_fishes",
    functionalGroupName: "Small demersal fishes",
  },
  syc: {
    stockCode: "SYC",
    displayName: "Small-spotted catshark",
    scientificName: "Scyliorhinus canicula",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
  whb: {
    stockCode: "WHB",
    displayName: "Blue whiting(=Poutassou)",
    scientificName: "Micromesistius poutassou",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
  },
} as const satisfies Record<string, WestMediterraneanSpeciesEntry>;

export const WEST_MEDITERRANEAN_FUNCTIONAL_GROUP_MAP = {
  cephalopods: {
    displayName: "Cephalopods",
    species: [
      {
        speciesKey: "sqm",
        stockCode: "SQM",
        displayName: "Broadtail shortfin squid",
        scientificName: "Illex coindetii",
      },
      {
        speciesKey: "occ",
        stockCode: "OCC",
        displayName: "Common octopus",
        scientificName: "Octopus vulgaris",
      },
      {
        speciesKey: "sqe",
        stockCode: "SQE",
        displayName: "European flying squid",
        scientificName: "Todarodes sagittatus",
      },
      {
        speciesKey: "eoi",
        stockCode: "EOI",
        displayName: "Horned octopus",
        scientificName: "Eledone cirrhosa",
      },
    ],
  },
  crustaceans: {
    displayName: "Crustaceans",
    species: [
      {
        speciesKey: "lko",
        stockCode: "LKO",
        displayName: "Arrow shrimp",
        scientificName: "Plesionika heterocarpus",
      },
      {
        speciesKey: "ara",
        stockCode: "ARA",
        displayName: "Blue and red shrimp",
        scientificName: "Aristeus antennatus",
      },
      {
        speciesKey: "lkt",
        stockCode: "LKT",
        displayName: "Golden shrimp",
        scientificName: "Plesionika martia",
      },
      {
        speciesKey: "grq",
        stockCode: "GRQ",
        displayName: "Mediterranean geryon",
        scientificName: "Geryon longipes",
      },
      {
        speciesKey: "nep",
        stockCode: "NEP",
        displayName: "Norway lobster",
        scientificName: "Nephrops norvegicus",
      },
      {
        speciesKey: "olv",
        stockCode: "OLV",
        displayName: "Paromola",
        scientificName: "Paromola cuvieri",
      },
      {
        speciesKey: "mts",
        stockCode: "MTS",
        displayName: "Spottail mantis squillid",
        scientificName: "Squilla mantis",
      },
    ],
  },
  large_demersal_fishes: {
    displayName: "Large demersal fishes",
    species: [
      {
        speciesKey: "soo",
        stockCode: "SOO",
        displayName: "[Solea spp]",
        scientificName: "Solea spp",
      },
      {
        speciesKey: "mon",
        stockCode: "MON",
        displayName: "Angler(=Monk)",
        scientificName: "Lophius piscatorius",
      },
      {
        speciesKey: "ank",
        stockCode: "ANK",
        displayName: "Blackbellied angler",
        scientificName: "Lophius budegassa",
      },
      {
        speciesKey: "sho",
        stockCode: "SHO",
        displayName: "Blackmouth catshark",
        scientificName: "Galeus melastomus",
      },
      {
        speciesKey: "bsh",
        stockCode: "BSH",
        displayName: "Blue shark",
        scientificName: "Prionace glauca",
      },
      {
        speciesKey: "whb",
        stockCode: "WHB",
        displayName: "Blue whiting(=Poutassou)",
        scientificName: "Micromesistius poutassou",
      },
      {
        speciesKey: "bll",
        stockCode: "BLL",
        displayName: "Brill",
        scientificName: "Scophthalmus rhombus",
      },
      {
        speciesKey: "jdp",
        stockCode: "JDP",
        displayName: "Common stingray",
        scientificName: "Dasyatis pastinaca",
      },
      {
        speciesKey: "coe",
        stockCode: "COE",
        displayName: "European conger",
        scientificName: "Conger conger",
      },
      {
        speciesKey: "hke",
        stockCode: "HKE",
        displayName: "European hake",
        scientificName: "Merluccius merluccius",
      },
      {
        speciesKey: "jrs",
        stockCode: "JRS",
        displayName: "Mediterranean starry ray",
        scientificName: "Raja asterias",
      },
      {
        speciesKey: "sfs",
        stockCode: "SFS",
        displayName: "Silver scabbardfish",
        scientificName: "Lepidopus caudatus",
      },
      {
        speciesKey: "syc",
        stockCode: "SYC",
        displayName: "Small-spotted catshark",
        scientificName: "Scyliorhinus canicula",
      },
    ],
  },
  large_pelagic_fishes: {
    displayName: "Large pelagic fishes",
    species: [
      {
        speciesKey: "alb",
        stockCode: "ALB",
        displayName: "Albacore",
        scientificName: "Thunnus alalunga",
      },
      {
        speciesKey: "bft",
        stockCode: "BFT",
        displayName: "Atlantic bluefin tuna",
        scientificName: "Thunnus thynnus",
      },
      {
        speciesKey: "bon",
        stockCode: "BON",
        displayName: "Atlantic bonito",
        scientificName: "Sarda sarda",
      },
    ],
  },
  medium_demersal_fishes: {
    displayName: "Medium demersal fishes",
    species: [
      {
        speciesKey: "sba",
        stockCode: "SBA",
        displayName: "Axillary seabream",
        scientificName: "Pagellus acarne",
      },
      {
        speciesKey: "brf",
        stockCode: "BRF",
        displayName: "Blackbelly rosefish",
        scientificName: "Helicolenus dactylopterus",
      },
      {
        speciesKey: "pac",
        stockCode: "PAC",
        displayName: "Common pandora",
        scientificName: "Pagellus erythrinus",
      },
      {
        speciesKey: "mut",
        stockCode: "MUT",
        displayName: "Red mullet",
        scientificName: "Mullus barbatus",
      },
      {
        speciesKey: "srg",
        stockCode: "SRG",
        displayName: "Sargo breams nei",
        scientificName: "Diplodus spp",
      },
      {
        speciesKey: "cil",
        stockCode: "CIL",
        displayName: "Spotted flounder",
        scientificName: "Citharus linguatula",
      },
    ],
  },
  medium_pelagic_fishes: {
    displayName: "Medium pelagic fishes",
    species: [
      {
        speciesKey: "hom",
        stockCode: "HOM",
        displayName: "Atlantic horse mackerel",
        scientificName: "Trachurus trachurus",
      },
      {
        speciesKey: "mac",
        stockCode: "MAC",
        displayName: "Atlantic mackerel",
        scientificName: "Scomber scombrus",
      },
      {
        speciesKey: "jaa",
        stockCode: "JAA",
        displayName: "Blue jack mackerel",
        scientificName: "Trachurus picturatus",
      },
      {
        speciesKey: "hmm",
        stockCode: "HMM",
        displayName: "Mediterranean horse mackerel",
        scientificName: "Trachurus mediterraneus",
      },
      {
        speciesKey: "pod",
        stockCode: "POD",
        displayName: "Poor cod",
        scientificName: "Trisopterus minutus",
      },
      {
        speciesKey: "bib",
        stockCode: "BIB",
        displayName: "Pouting(=Bib)",
        scientificName: "Trisopterus luscus",
      },
    ],
  },
  other_invertebrates: {
    displayName: "Other invertebrates",
    species: [
      {
        speciesKey: "boy",
        stockCode: "BOY",
        displayName: "Purple dye murex",
        scientificName: "Bolinus brandaris",
      },
    ],
  },
  small_demersal_fishes: {
    displayName: "Small demersal fishes",
    species: [
      {
        speciesKey: "bog",
        stockCode: "BOG",
        displayName: "Bogue",
        scientificName: "Boops boops",
      },
      {
        speciesKey: "srj",
        stockCode: "SRJ",
        displayName: "Brown comber",
        scientificName: "Serranus hepatus",
      },
      {
        speciesKey: "ldb",
        stockCode: "LDB",
        displayName: "Four-spot megrim",
        scientificName: "Lepidorhombus boscii",
      },
      {
        speciesKey: "ldv",
        stockCode: "LDV",
        displayName: "Large-scaled gurnard",
        scientificName: "Lepidotrigla cavillone",
      },
    ],
  },
  small_pelagic_fishes: {
    displayName: "Small pelagic fishes",
    species: [
      {
        speciesKey: "ane",
        stockCode: "ANE",
        displayName: "European anchovy",
        scientificName: "Engraulis encrasicolus",
      },
      {
        speciesKey: "pil",
        stockCode: "PIL",
        displayName: "European pilchard(=Sardine)",
        scientificName: "Sardina pilchardus",
      },
      {
        speciesKey: "spc",
        stockCode: "SPC",
        displayName: "Picarel",
        scientificName: "Spicara smaris",
      },
      {
        speciesKey: "saa",
        stockCode: "SAA",
        displayName: "Round sardinella",
        scientificName: "Sardinella aurita",
      },
    ],
  },
} as const satisfies Record<string, WestMediterraneanFunctionalGroupEntry>;

export const WEST_MEDITERRANEAN_SPECIES_OPTIONS = Object.values(
  WEST_MEDITERRANEAN_SPECIES_MAP,
)
  .slice()
  .sort((left, right) => left.stockCode.localeCompare(right.stockCode))
  .map((species) => ({
    value: species.stockCode,
    label: species.displayName,
  }));

export const WEST_MEDITERRANEAN_FUNCTIONAL_GROUP_OPTIONS = [
  { value: "all", label: "All functional groups" },
  ...Object.entries(WEST_MEDITERRANEAN_FUNCTIONAL_GROUP_MAP)
    .sort(([, left], [, right]) =>
      left.displayName.localeCompare(right.displayName),
    )
    .map(([groupKey, group]) => ({
      value: groupKey,
      label: group.displayName,
    })),
] as const;

export const getWestMediterraneanSpeciesEntry = (stockCode: string) => {
  const speciesKey =
    stockCode.toLowerCase() as keyof typeof WEST_MEDITERRANEAN_SPECIES_MAP;
  return WEST_MEDITERRANEAN_SPECIES_MAP[speciesKey];
};
