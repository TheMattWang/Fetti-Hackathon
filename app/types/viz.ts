export type ChartType =
  | "table" | "bar" | "line" | "area" | "scatter" | "hist" | "box" | "pie" | "funnel" | "choropleth" | "text";

export type FieldType = "quant" | "cat" | "time" | "geo" | "lat" | "lon";

export type Field = { name: string; type: FieldType };

export type ChartSpec = {
  type: ChartType;
  x?: string;
  y?: string;
  series?: string;
  agg?: "sum"|"avg"|"count"|"median"|"min"|"max";
  sort?: "asc"|"desc";
  bin?: { field: string; maxbins?: number } | null;
  confidence?: { field: string; lower: string; upper: string } | null;
  tooltip?: string[];
  goal?: number | null;
};

export type VizPlan = {
  intent: "describe"|"trend"|"compare"|"segment"|"forecast"|"distribution"|"map"|"funnel";
  question: string;
  dataset: string;
  sql: string;
  fields: Field[];
  filters?: any[];
  chart: ChartSpec;
  transforms?: Array<{ op: "topk"|"compute"; by?: string; k?: number; as?: string; expr?: string }>;
  narrative?: string | null;
  quality?: { rowCount?: number; rowCountCapHit?: boolean; warnings?: string[] };
};

export type VizPayload = { plan: VizPlan; rows: any[] };
