import type { SimulationCaseId } from "../../data/simulationCases";

export type ScenarioFlowReference =
  | string
  | {
      label: string;
      url: string;
    };

export type ScenarioFlowNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  title: string;
  subtitle?: string;
  hoverTitle: string;
  hoverDescription: string;
  videoUrl?: string;
  references?: ScenarioFlowReference[];
  cardX: number;
  cardY: number;
};

export type ScenarioFlowEdgeLabel = {
  text: string;
  x: number;
  y: number;
  tone?: "default" | "muted";
};

export type ScenarioFlowEdge = {
  id: string;
  path: string;
  labels?: ScenarioFlowEdgeLabel[];
};

export type ScenarioFlowGraph = {
  ariaLabel: string;
  nodes: ScenarioFlowNode[];
  edges: ScenarioFlowEdge[];
};

const cloneNode = (node: ScenarioFlowNode): ScenarioFlowNode => ({
  ...node,
  references: node.references ? [...node.references] : undefined,
});

const cloneEdge = (edge: ScenarioFlowEdge): ScenarioFlowEdge => ({
  ...edge,
  labels: edge.labels?.map((label) => ({ ...label })),
});

const getNodeById = (
  nodes: ScenarioFlowNode[],
  nodeId: ScenarioFlowNode["id"],
): ScenarioFlowNode => {
  const node = nodes.find(({ id }) => id === nodeId);

  if (!node) {
    throw new Error(`Missing scenario flow node: ${nodeId}`);
  }

  return node;
};

const westernMediterraneanNodes: ScenarioFlowNode[] = [
  {
    id: "poseidon",
    x: 185,
    y: 44,
    width: 400,
    height: 74,
    fill: "#f08a33",
    title: "POSEIDON",
    subtitle: "Spanish purse seiners and bottom trawlers",
    hoverTitle: "POSEIDON",
    hoverDescription:
      "POSEIDON is an advanced simulation tool designed to help manage fisheries by modelling the behaviour of fishing fleets and their interactions with the environment. Using an approach based on adaptive agents —which are individual units in the model that learn, adapt, and make decisions based on their environment and experiences— it simulates how fishers respond to changing conditions, such as shifts in fish stock abundance, market prices, or regulatory policies, helping policymakers evaluate different strategies for managing fisheries in a sustainable way. In SURIMI we employ this model to help with management strategy evaluation and, in turn, help create policies that balance marine conservation with the needs of fishing communities.",
    videoUrl:
      "https://www.youtube.com/watch?v=W_A52O_A84g&list=PLXKTm_QGiR-hSkLXN1wKySu-wT32br00T&index=3",
    references: [
      "Madsen, J.K. et al. (2024). Modelling adaptive and anticipatory human decision-making in complex human-environment system. Journal of Artificial Societies and Social Simulation 27 (1) 1.",
      "Payette, N. et al. (2023). Attracted to Fish: A Gravity-Based Model of Purse-Seine Vessel Behaviour. In: Squazzoni, F. (eds) Advances in Social Simulation. ESSA 2022. Springer Proceedings in Complexity. Springer, Cham.",
      "Carrella, E., et al. (2020). Simple adaptive rules describe fishing behaviour better than perfect rationality in the US West Coast Groundfish fishery. Ecological Economics, 169, 106449.",
      "Bailey, R. M. et al. (2019). A computational approach to managing coupled human-environmental systems: the POSEIDON model of ocean fisheries. Sustainability Science, 14, 259-275.",
    ],
    cardX: 0.78,
    cardY: 0.18,
  },
  {
    id: "cmsy",
    x: 0,
    y: 182,
    width: 160,
    height: 72,
    fill: "#7887d3",
    title: "CMSY++",
    subtitle: "Stock assessments",
    hoverTitle: "CMSY++",
    hoverDescription:
      "The CMSY++ Assessment Model, used within SURIMI, assesses the health and future status of fish stocks, especially in situations where fisheries data are limited. It is based on the concept of Maximum Sustainable Yield (MSY), defined as the highest average catch that can be continuously taken from an exploited population under average environmental conditions. MSY represents the highest catch that still allows a population to sustain itself through growth, reproduction, and recruitment. CMSY++ applies a Bayesian surplus production (Schaefer-type) modelling approach to analyse catch time series and, when available, abundance data. These are combined with prior knowledge of species biology and productivity, including population growth rate and stock depletion, from which carrying capacity is estimated. The model explores different population trajectories consistent with the observed data, allowing reconstruction of biomass over time even when information is incomplete. Based on the available data, CMSY++ estimates key quantities used in fisheries management, including stock biomass, fishing mortality, and reference points related to MSY, such as biomass compared to the level under sustainable fishing and fishing pressure compared to the level under sustainable fishing. CMSY++ allows users to evaluate whether a fish stock is sustainably exploited, overfished, or recovering, translating catch and survey information into clear management indicators that support evidence-based decision-making and inform actions such as adjusting fishing effort, setting catch limits, or prioritising stocks for recovery.",
    videoUrl:
      "https://www.youtube.com/watch?v=E1GU7_n1giM&list=PLXKTm_QGiR-hSkLXN1wKySu-wT32br00T&index=4",
    references: [
      "Froese, R. et al. (2023). New developments in the analysis of catch time series as the basis for fish stock assessments: The CMSY++ method. Acta Ichthyologica et Piscatoria, 53: 173-189.",
      "Tsikliras, A.C., Froese, R. (2019) Maximum Sustainable Yield. p. 108-115. In: Fath B (Ed) Encyclopedia of Ecology, Second Edition, Volume 1. Elsevier, Oxford.",
      "Graham, M. (1943). The Fish Gate. London: Faber and Faber.",
    ],
    cardX: 0.2,
    cardY: 0.58,
  },
  {
    id: "market",
    x: 220,
    y: 182,
    width: 160,
    height: 72,
    fill: "#8d8f96",
    title: "Market",
    subtitle: "System Dynamics Model",
    hoverTitle: "Market Model",
    hoverDescription:
      "SURIMI combines different models to capture the dynamic interactions among ecological, social, and economic factors in a fishery system. When data are insufficient, specific components of advanced models sometimes cannot be sufficiently informed. In such a case, system dynamics models are designed to fill the model gaps with tailored puzzle pieces. This allows SURIMI to replace data-heavy model components of advanced models with simpler alternatives, reducing reliance on large datasets while still capturing the essential dynamics of the fishery system. System dynamics modelling is a mathematical technique that maps how things in a system are related and change over time. Key parts of a system dynamics model include causal loops, and stocks and flows. Applied to fisheries, a causal loop can for example illustrate how various factors interact to either increase or decrease the fish population.",
    videoUrl:
      "https://www.youtube.com/watch?v=cK8JoxFI6bU&list=PLXKTm_QGiR-hSkLXN1wKySu-wT32br00T&index=7",
    references: [
      "Charles, A. (2023). Sustainable fishery systems. John Wiley & Sons.",
      "Bala, B. K., Arshad, F. M., & Noh, K. M. (2017). System dynamics. Modelling and Simulation, 274.",
      "Schluter, M., Hinkel, J., Bots, P. W., & Arlinghaus, R. (2014). Application of the SES framework for model-based analysis of the dynamics of social-ecological systems. Ecology and Society, 19(1).",
    ],
    cardX: 0.5,
    cardY: 0.58,
  },
  {
    id: "authority",
    x: 400,
    y: 182,
    width: 160,
    height: 72,
    fill: "#7ea7df",
    title: "MICE\nModel",
    hoverTitle: "MICE Ecosystem Model",
    hoverDescription:
      "Models of Intermediate Complexity for Ecosystem assessments (MICE) aim to strike a balance between overly simple models, which may miss key ecological processes, and highly complex models, which can be computationally intense, data-hungry, and difficult to interpret. The goal of MICE models is to capture essential ecological dynamics and interactions with enough realism to inform conservation and management, while remaining accessible and applicable in practical scenarios. In SURIMI, we use MICE models in parallel with whole-of-system EwE models. We gradually simplify the EwE models to MICE models at different levels of complexity, which we expect to produce contrasting results that provide a measure of structural uncertainty related to the complexity of the marine ecosystem models used. This is an underutilised method in marine ecosystem modelling which can provide more robust model outputs to policy and decision makers.",
    references: [
      "Murphy K. et al. (2024). Developing a Southern Ocean Marine Ecosystem Model Ensemble To Assess Climate Risks and Uncertainties. ESS Open Archive. INPRESS.",
      "Angelini, S. et al. (2016). An Ecosystem Model of Intermediate Complexity to test management options for fisheries: A case study. Ecological Modelling 319, 218-232.",
      {
        label:
          "Plaganyi, E., Kenyon, R., Blamey, L. et al. Integrated assessment of river development on downstream marine fisheries and ecosystems. Nature Sustainability 7, 31-44 (2024).",
        url: "https://doi.org/10.1038/s41893-023-01238-x",
      },
    ],
    cardX: 0.72,
    cardY: 0.58,
  },
  {
    id: "value-chain",
    x: 620,
    y: 182,
    width: 160,
    height: 72,
    fill: "#df766f",
    title: "Value Chain",
    hoverTitle: "Value Chain",
    hoverDescription:
      "To account for how fish landings move from the sea to the final customers, the EwE approach contains a Value Chain module that can run with the Ecosim and Ecospace models. The Value Chain describes at a high level how the raw materials are distributed and processed, adding value through various processes, to be sold and consumed. Integrating a Value Chain model into a mechanistic marine ecosystem model provides a foundation for evaluating management strategies, both in terms of ecology and societal benefits.",
    videoUrl:
      "https://www.youtube.com/watch?v=lWVfgNWRLC4&list=PLXKTm_QGiR-hSkLXN1wKySu-wT32br00T&index=6",
    references: [
      {
        label:
          "Bevilacqua, A. H. V., Angelini, R., Steenbeek, J., Christensen, V., & Carvalho, A. R. (2019). Following the Fish: The Role of Subsistence in a Fish-based Value Chain. Ecological Economics, 159: 326-334.",
        url: "https://doi.org/10.1016/j.ecolecon.2019.02.004",
      },
      {
        label:
          "Christensen, V., Steenbeek, J. & Failler, P. (2011). A combined ecosystem and value chain modeling approach for evaluating societal cost and benefit of fishing. Ecological Modelling 222, 857-864.",
        url: "https://doi.org/10.1016/j.ecolmodel.2010.09.030",
      },
      {
        label:
          "Craig, J. K., & Link, J. S. (2023). It is past time to use ecosystem models tactically to support ecosystem-based fisheries management: Case studies using Ecopath with Ecosim in an operational management context. Fish and Fisheries, 24(3), 381-406.",
        url: "https://doi.org/10.1111/faf.12733",
      },
      {
        label:
          "De la Puente S, Christensen V. 2024. Linking catch reconstructions with downstream supply chain nodes can help strengthen management actions in favour of just, sustainable and resilient futures. Marine Policy 170: 106387.",
        url: "https://doi.org/10.1016/j.marpol.2024.106387",
      },
    ],
    cardX: 0.84,
    cardY: 0.54,
  },
  {
    id: "ecopath",
    x: 185,
    y: 314,
    width: 400,
    height: 78,
    fill: "#b8e35f",
    title: "Ecopath with Ecosim",
    subtitle: "Ecology. All other fleets",
    hoverTitle: "Ecopath with Ecosim",
    hoverDescription:
      "Ecopath with Ecosim (EwE) model is the world's most widely used approach for ecosystem based management, and includes a modelling framework with three core modules: Ecopath, Ecosim and Ecospace. The foundational Ecopath model describes a possible representation of a marine food web, accounting for relations between living and abiotic components and fishing. The Ecopath model is mass-balanced, accounting for the energy flows into, through and out of an ecosystem for a given period. The construction of an Ecopath model helps to understand the structure and working of an ecosystem, and provides initial parameterization for the dynamic modules. For research questions that involve a time component, the Ecosim model takes the Ecopath parameter set and expands it with behaviour, environmental sensitivity, environmental change, and changes in fishing pressure and other human impacts, such as noise. The Ecosim model is tested to see if it can successfully reproduce past trends observed in the ecosystem. If so, the model may be used to explore plausible futures related to climate and management. For research questions related to both time and space, the Ecospace model executes the Ecosim model across a grid of homogenous cells, where creatures and fisheries move depending on the layout of space and changing environmental conditions.",
    videoUrl:
      "https://www.youtube.com/watch?v=lZaPsg5qVbU&list=PLXKTm_QGiR-hSkLXN1wKySu-wT32br00T&index=5",
    references: [
      {
        label:
          "Bentley JW, Chagaris D, Coll M, Heymans JJ, Serpetti N, Walters CJ, Christensen V. 2024. Calibrating ecosystem models to support ecosystem based management of marine systems. ICES Journal of Marine Science. 81(2): 260-275.",
        url: "https://doi.org/10.1093/icesjms/fsad213",
      },
      {
        label:
          "Christensen, V. & Walters, C.J. 2004. Ecopath with Ecosim: methods, capabilities and limitations. Ecological Modelling 172, 109-139.",
        url: "https://doi.org/10.1016/j.ecolmodel.2003.09.003",
      },
      {
        label:
          "Christensen, V. and Walters, C.J. 2024. Ecosystem Modelling with EwE. Vancouver, BC: The University of British Columbia.",
        url: "https://doi.org/10.14288/24d7-ab68",
      },
      {
        label:
          "Heymans, J.J., Coll, M., Link, J.S., Mackinson, S., Steenbeek, J., Walters, C.J., Christensen, V., 2016. Best practice in developing, balancing, fitting and using Ecopath with Ecosim food-web models for ecosystem-based management, obtaining ecosystem baselines and testing theoretical ecological hypotheses. Ecological Modelling, 331: 173-184.",
        url: "https://www.sciencedirect.com/science/article/pii/S030438001500575X?via%3Dihub",
      },
      {
        label:
          "Steenbeek, J., M Coll, L Gurney, F Melin, N Hoepffner, J Buszowski, V Christensen. 2013. Bridging the gap between ecosystem modelling tools using geographic information systems: driving a food-web model with spatial-temporal primary production data. Ecological Modelling, 263:139-151.",
        url: "https://www.sciencedirect.com/science/article/abs/pii/S0304380013002597?via%3Dihub",
      },
    ],
    cardX: 0.76,
    cardY: 0.74,
  },
];

const westernMediterraneanEdges: ScenarioFlowEdge[] = [
  {
    id: "poseidon-to-cmsy",
    path: "M185 82 H80 V182",
    labels: [{ text: "Catches", x: 118, y: 76 }],
  },
  {
    id: "ecopath-to-poseidon",
    path: "M575 314 V118",
    labels: [{ text: "Biomass", x: 610, y: 300 }],
  },
  {
    id: "poseidon-to-ecopath",
    path: "M200 118 V314",
    labels: [{ text: "Catches", x: 168, y: 142, tone: "muted" }],
  },
  {
    id: "poseidon-to-market",
    path: "M276 118 V182",
    labels: [{ text: "Sales", x: 258, y: 142, tone: "muted" }],
  },
  {
    id: "market-to-poseidon",
    path: "M324 182 V118",
    labels: [{ text: "Prices", x: 348, y: 176, tone: "muted" }],
  },
  {
    id: "poseidon-to-authority",
    path: "M452 118 V182",
    labels: [{ text: "Catches and\nFishing activity", x: 396, y: 134 }],
  },
  {
    id: "authority-to-poseidon",
    path: "M500 182 V118",
    labels: [{ text: "Limits", x: 524, y: 166, tone: "muted" }],
  },
  {
    id: "poseidon-to-value-chain",
    path: "M585 82 H700 V182",
    labels: [{ text: "Sales", x: 646, y: 76 }],
  },
  {
    id: "ecopath-to-cmsy",
    path: "M185 368 H80 V254",
    labels: [{ text: "Biomass\nand catches", x: 58, y: 404 }],
  },
  {
    id: "ecopath-to-market",
    path: "M276 314 V254",
    labels: [{ text: "Sales", x: 246, y: 302 }],
  },
  {
    id: "market-to-ecopath",
    path: "M324 254 V314",
    labels: [{ text: "Prices", x: 348, y: 310, tone: "muted" }],
  },
  {
    id: "ecopath-to-authority",
    path: "M452 314 V254",
    labels: [
      { text: "Biomass, catches,\nand Fishing activity", x: 390, y: 268 },
    ],
  },
  {
    id: "authority-to-ecopath",
    path: "M500 254 V314",
    labels: [{ text: "Limits", x: 524, y: 294, tone: "muted" }],
  },
  {
    id: "ecopath-to-value-chain",
    path: "M585 354 H700 V254",
    labels: [{ text: "Sales", x: 646, y: 368 }],
  },
];

const westernAuthorityNode = getNodeById(westernMediterraneanNodes, "authority");
const westernEcopathNode = getNodeById(westernMediterraneanNodes, "ecopath");

const aegeanSeaNodes: ScenarioFlowNode[] = westernMediterraneanNodes
  .filter(({ id }) => id !== "poseidon")
  .map((node) => {
    if (node.id === "authority") {
      return {
        ...cloneNode(node),
        fill: westernEcopathNode.fill,
        title: "Ecopath",
        subtitle: "Ecology. All other fleets",
        hoverTitle: westernEcopathNode.hoverTitle,
        hoverDescription: westernEcopathNode.hoverDescription,
        videoUrl: westernEcopathNode.videoUrl,
        references: westernEcopathNode.references
          ? [...westernEcopathNode.references]
          : undefined,
      };
    }

    if (node.id === "ecopath") {
      return {
        ...cloneNode(node),
        fill: westernAuthorityNode.fill,
        title: "MICE Model",
        subtitle: "(EwE)",
        hoverTitle: westernAuthorityNode.hoverTitle,
        hoverDescription: westernAuthorityNode.hoverDescription,
        videoUrl: westernAuthorityNode.videoUrl,
        references: westernAuthorityNode.references
          ? [...westernAuthorityNode.references]
          : undefined,
      };
    }

    return cloneNode(node);
  });

const aegeanSeaEdges: ScenarioFlowEdge[] = westernMediterraneanEdges
  .filter(({ id }) => !id.includes("poseidon"))
  .map(cloneEdge);

const anchovyBayNodes: ScenarioFlowNode[] = westernMediterraneanNodes.map(
  cloneNode,
);

const anchovyBayEdges: ScenarioFlowEdge[] = westernMediterraneanEdges.map(
  cloneEdge,
);

const scenarioFlowGraphs: Record<SimulationCaseId, ScenarioFlowGraph> = {
  "northwestern-mediterranean": {
    ariaLabel:
      "Scenario model flow graph linking Poseidon, CMSY++, Market, MICE Model, Value Chain, and Ecopath with Ecosim",
    nodes: westernMediterraneanNodes,
    edges: westernMediterraneanEdges,
  },
  "aegean-sea": {
    ariaLabel:
      "Scenario model flow graph linking CMSY++, Market, Ecopath, MICE Model EwE, and Value Chain",
    nodes: aegeanSeaNodes,
    edges: aegeanSeaEdges,
  },
  "anchovy-bay": {
    ariaLabel:
      "Scenario model flow graph linking Poseidon, CMSY++, Market, MICE Model, Value Chain, and Ecopath with Ecosim",
    nodes: anchovyBayNodes,
    edges: anchovyBayEdges,
  },
};

export const getScenarioFlowGraph = (
  caseId: SimulationCaseId,
): ScenarioFlowGraph => {
  return scenarioFlowGraphs[caseId];
};
