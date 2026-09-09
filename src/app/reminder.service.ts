import { Injectable, signal } from '@angular/core';
import { DevisStatus, Quote, Reminder, ReminderPriority, ReminderSummary, ReminderType } from './quote.model';

@Injectable({ providedIn: 'root' })
export class QuoteReminderService {
  private readonly storageKey = 'relance-devis-quotes';
  private readonly processedRemindersKey = 'relance-devis-processed-reminders';
  readonly quotes = signal<Quote[]>(this.loadQuotes());

  getQuoteById(quoteId: string): Quote | undefined {
    return this.quotes().find((quote) => quote.id === quoteId);
  }

  saveQuote(quote: Quote): void {
    const nextQuotes = [quote, ...this.quotes().filter((item) => item.id !== quote.id)].slice(0, 20);
    this.quotes.set(nextQuotes);
    this.persistQuotes(nextQuotes);
  }

  incrementReminderCount(quoteId: string): void {
    const next = this.quotes().map((quote) => {
      if (quote.id !== quoteId) return quote;
      return {
        ...quote,
        remindersCount: quote.remindersCount + 1,
        lastReminderAt: new Date().toISOString(),
        status: quote.status === 'PENDING' ? 'NO_RESPONSE' : quote.status
      };
    });
    this.quotes.set(next);
    this.persistQuotes(next);
  }

  getPendingReminders(): ReminderSummary[] {
    const processed = this.loadProcessedReminderIds();
    const reminders = this.quotes()
      .flatMap((quote) => this.buildReminderTimeline(quote)
        .filter((reminder) => !processed.includes(reminder.id))
        .map((reminder) => ({ ...reminder, quote })))
      .sort((left, right) => this.priorityScore(right.priority) - this.priorityScore(left.priority));

    return reminders;
  }

  getProcessedReminders(): ReminderSummary[] {
    const processed = this.loadProcessedReminderIds();
    const reminders = this.quotes()
      .flatMap((quote) => this.buildReminderTimeline(quote)
        .filter((reminder) => processed.includes(reminder.id))
        .map((reminder) => ({ ...reminder, quote })))
      .sort((left, right) => this.priorityScore(right.priority) - this.priorityScore(left.priority));

    return reminders;
  }

  getReminderCount(): number {
    return this.getPendingReminders().length;
  }

  markReminderAsDone(reminderId: string): void {
    const current = this.loadProcessedReminderIds();
    const next = Array.from(new Set([...current, reminderId]));
    localStorage.setItem(this.processedRemindersKey, JSON.stringify(next));

    const quote = this.quotes().find((item) =>
      this.buildReminderTimeline(item).some((reminder) => reminder.id === reminderId)
    );

    if (!quote) {
      return;
    }

    const currentQuotes = this.quotes().map((item) => {
      if (item.id !== quote.id) return item;
      return {
        ...item,
        remindersCount: Math.max(item.remindersCount, this.buildReminderTimeline(item).findIndex((reminder) => reminder.id === reminderId) + 1),
        lastReminderAt: new Date().toISOString(),
        status: item.status === 'PENDING' ? 'NO_RESPONSE' : item.status
      };
    });

    this.quotes.set(currentQuotes);
    this.persistQuotes(currentQuotes);
  }

  createDefaultQuotes(): Quote[] {
    const today = new Date();
    const daysAgo = (count: number): string => new Date(today.getTime() - count * 86400000).toISOString();

    return [
      {
        id: 'quote-jean-dupont',
        clientFirstName: 'Jean',
        clientLastName: 'Dupont',
        clientEmail: 'jean.dupont@example.com',
        serviceDescription: 'Rénovation salle de bain',
        amount: 4500,
        sentAt: daysAgo(14),
        lastContactAt: daysAgo(14),
        status: 'NO_RESPONSE',
        remindersCount: 2,
        createdAt: daysAgo(14)
      },
      {
        id: 'quote-sophie-martin',
        clientFirstName: 'Sophie',
        clientLastName: 'Martin',
        clientEmail: 'sophie.martin@example.com',
        serviceDescription: 'Installation climatisation',
        amount: 2300,
        sentAt: daysAgo(7),
        lastContactAt: daysAgo(7),
        status: 'PENDING',
        remindersCount: 1,
        createdAt: daysAgo(7)
      },
      {
        id: 'quote-paul-leclerc',
        clientFirstName: 'Paul',
        clientLastName: 'Leclerc',
        clientEmail: 'paul.leclerc@example.com',
        serviceDescription: 'Agrandissement bureau',
        amount: 6800,
        sentAt: daysAgo(3),
        lastContactAt: daysAgo(3),
        status: 'PENDING',
        remindersCount: 0,
        createdAt: daysAgo(3)
      }
    ];
  }

  private buildReminderTimeline(quote: Quote): Reminder[] {
    if (quote.status !== 'PENDING' && quote.status !== 'NO_RESPONSE') {
      return [];
    }

    const daysSinceSent = this.diffInDays(new Date(), new Date(quote.sentAt));
    const reminders: Reminder[] = [];

    if (daysSinceSent >= 3) {
      reminders.push({
        id: `${quote.id}-first-reminder`,
        quoteId: quote.id,
        type: 'FIRST_REMINDER',
        dueDate: new Date().toISOString(),
        priority: 'LOW',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    if (daysSinceSent >= 7) {
      reminders.push({
        id: `${quote.id}-after-7-days`,
        quoteId: quote.id,
        type: 'AFTER_7_DAYS',
        dueDate: new Date().toISOString(),
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    if (daysSinceSent >= 10) {
      reminders.push({
        id: `${quote.id}-second-reminder`,
        quoteId: quote.id,
        type: 'SECOND_REMINDER',
        dueDate: new Date().toISOString(),
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    if (daysSinceSent >= 14) {
      reminders.push({
        id: `${quote.id}-last-reminder`,
        quoteId: quote.id,
        type: 'LAST_REMINDER',
        dueDate: new Date().toISOString(),
        priority: 'HIGH',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return reminders;
  }

  private loadQuotes(): Quote[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        const defaults = this.createDefaultQuotes();
        localStorage.setItem(this.storageKey, JSON.stringify(defaults));
        return defaults;
      }

      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed as Quote[] : this.createDefaultQuotes();
    } catch {
      return this.createDefaultQuotes();
    }
  }

  private persistQuotes(quotes: Quote[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(quotes));
  }

  private loadProcessedReminderIds(): string[] {
    try {
      const stored = localStorage.getItem(this.processedRemindersKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed as string[] : [];
    } catch {
      return [];
    }
  }

  private diffInDays(first: Date, second: Date): number {
    const ms = first.getTime() - second.getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  private priorityScore(priority: ReminderPriority): number {
    const score: Record<ReminderPriority, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };
    return score[priority];
  }
}
