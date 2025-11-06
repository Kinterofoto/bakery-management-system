import { initLogger } from "braintrust";

export const bt = initLogger({
  projectName: "bakery-ordenes-compra",
  apiKey: process.env.BRAINTRUST_API_KEY!,
});

export async function logEmailClassification(params: {
  input: string;
  output: string;
  metadata: any;
}): Promise<string> {
  const log: any = await bt.log({
    input: params.input,
    output: params.output,
    metadata: {
      ...params.metadata,
      workflow: "ordenes-compra",
      step: "classification",
    },
  });
  
  return log.id as string;
}

export async function logPDFExtraction(params: {
  input: any;
  output: any;
  metadata: any;
}): Promise<string> {
  const log: any = await bt.log({
    input: params.input,
    output: params.output,
    scores: {
      completeness: calculateCompleteness(params.output),
      hasAllRequiredFields: validateRequiredFields(params.output),
    },
    metadata: {
      ...params.metadata,
      workflow: "ordenes-compra",
      step: "extraction",
    },
  });
  
  return log.id as string;
}

function calculateCompleteness(data: any): number {
  const requiredFields = ['CLIENTE', 'OC', 'PRODUCTOS'];
  const present = requiredFields.filter(f => data[f]).length;
  return present / requiredFields.length;
}

function validateRequiredFields(data: any): number {
  return data.CLIENTE && data.OC && data.PRODUCTOS?.length > 0 ? 1 : 0;
}
