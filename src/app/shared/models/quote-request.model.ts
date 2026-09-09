export type RelanceScenario =
  | 'FIRST_REMINDER'
  | 'AFTER_7_DAYS'
  | 'SECOND_REMINDER'
  | 'LAST_REMINDER'
  | 'HESITANT_CLIENT';

export interface Scenario {
  id: RelanceScenario;
  label: string;
  icon: string;
  description: string;
}

export class QuoteRequest {
  readonly id: string;
  readonly clientName: string;
  readonly service: string;
  readonly amount: number;
  readonly quoteDate: string;
  readonly scenario: RelanceScenario;

  constructor(values: {
    clientName: string;
    service: string;
    amount: number;
    quoteDate: string;
    scenario: RelanceScenario;
  }) {
    this.id = `${values.clientName}-${values.service}-${values.quoteDate}-${values.scenario}`;
    this.clientName = values.clientName;
    this.service = values.service;
    this.amount = values.amount;
    this.quoteDate = values.quoteDate;
    this.scenario = values.scenario;
  }
}
