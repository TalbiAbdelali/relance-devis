export type Tone = 'professionnel' | 'amical' | 'direct';

export class QuoteRequest {
  readonly id: string;
  readonly clientName: string;
  readonly service: string;
  readonly amount: number;
  readonly quoteDate: string;
  readonly tone: Tone;

  constructor(values: {
    clientName: string;
    service: string;
    amount: number;
    quoteDate: string;
    tone: Tone;
  }) {
    this.id = `${values.clientName}-${values.service}-${values.quoteDate}`;
    this.clientName = values.clientName;
    this.service = values.service;
    this.amount = values.amount;
    this.quoteDate = values.quoteDate;
    this.tone = values.tone;
  }
}
