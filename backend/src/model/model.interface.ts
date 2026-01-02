export interface ModelOption {
  model: string;
  provider: string;
  name: string;
  params: ModelParams
}

export interface ModelOptions {
  name: string; // testModel or judgeModel
  options: ModelOption[];
}

export interface ModelParams {
  temperature?: number;
  top_p?: number;
  reasoning_effort?: number;
  openaiReasoning?: boolean;
}
