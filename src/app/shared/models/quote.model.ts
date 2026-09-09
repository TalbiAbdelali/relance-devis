export type DevisStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'NO_RESPONSE';
export type ReminderType =
  | 'FIRST_REMINDER'
  | 'AFTER_7_DAYS'
  | 'SECOND_REMINDER'
  | 'LAST_REMINDER'
  | 'HESITANT_CLIENT';

export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReminderStatus = 'PENDING' | 'COMPLETED';

export interface Quote {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceDescription: string;
  amount: number;
  sentAt: string;
  lastContactAt?: string;
  status: DevisStatus;
  remindersCount: number;
  lastReminderAt?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  quoteId: string;
  type: ReminderType;
  dueDate: string;
  priority: ReminderPriority;
  status: ReminderStatus;
  createdAt: string;
}

export interface ReminderSummary extends Reminder {
  quote: Quote;
}
