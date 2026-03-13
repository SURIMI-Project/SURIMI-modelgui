import type { SalesData } from "../types";

export const salesData: SalesData = {
  sales_summaries: [
    {
      market_code: "ESJAV",
      currency: "EUR",
      sales: [
        { species: { species_code: "MAC" }, quantity: 257.2, value: 295.61 },
        { species: { species_code: "MTS" }, quantity: 132.8, value: 345.33 },
        { species: { species_code: "PIL" }, quantity: 301.5, value: 538.1 },
      ],
    },
    {
      market_code: "ESPAL",
      currency: "EUR",
      sales: [
        { species: { species_code: "HKE" }, quantity: 192.4, value: 652.8 },
        { species: { species_code: "NEP" }, quantity: 76.2, value: 312.14 },
      ],
    },
    {
      market_code: "ESVLC",
      currency: "EUR",
      sales: [
        { species: { species_code: "ARA" }, quantity: 149.1, value: 442.8 },
        { species: { species_code: "PAC" }, quantity: 98.7, value: 235.09 },
      ],
    },
  ],
};
