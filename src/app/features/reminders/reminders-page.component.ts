import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { QuoteReminderService } from '../../core/services/quote-reminder.service';
import { ReminderSummary } from '../../shared/models/quote.model';

@Component({
  selector: 'app-reminders-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './reminders-page.component.html',
  styleUrl: './reminders-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemindersPageComponent {
  private readonly reminderService = inject(QuoteReminderService);
  private readonly router = inject(Router);

  protected readonly reminders = computed(() =>
    this.reminderService.getPendingReminders().map((reminder) => ({
      ...reminder,
      clientName: this.getClientName(reminder),
      serviceLabel: this.getServiceLabel(reminder),
      amountValue: this.getAmount(reminder)
    }))
  );

  protected readonly processedReminders = computed(() =>
    this.reminderService.getProcessedReminders().map((reminder) => ({
      ...reminder,
      clientName: this.getClientName(reminder),
      serviceLabel: this.getServiceLabel(reminder),
      amountValue: this.getAmount(reminder)
    }))
  );

  protected readonly reminderCount = computed(() => this.reminders().length);

  protected getPriorityLabel(priority: ReminderSummary['priority']): string {
    switch (priority) {
      case 'HIGH': return 'Urgent';
      case 'MEDIUM': return 'À relancer';
      default: return 'En attente';
    }
  }

  protected getPriorityClass(priority: ReminderSummary['priority']): string {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      default: return 'priority-low';
    }
  }

  protected getReminderTypeLabel(type: ReminderSummary['type']): string {
    switch (type) {
      case 'FIRST_REMINDER': return 'Première relance';
      case 'AFTER_7_DAYS': return 'Relance après 7 jours';
      case 'SECOND_REMINDER': return 'Deuxième relance';
      case 'LAST_REMINDER': return 'Dernière relance';
      case 'HESITANT_CLIENT': return 'Client hésitant';
      default: return 'Relance';
    }
  }

  protected getClientName(reminder: ReminderSummary): string {
    const fullName = [reminder.quote?.clientFirstName, reminder.quote?.clientLastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || 'Client';
  }

  protected getServiceLabel(reminder: ReminderSummary): string {
    return reminder.quote?.serviceDescription || 'Prestation non renseignée';
  }

  protected getAmount(reminder: ReminderSummary): number {
    return Number(reminder.quote?.amount ?? 0);
  }

  protected getDaysWithoutResponse(reminder: ReminderSummary): number {
    const diff = new Date().getTime() - new Date(reminder.quote.sentAt).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  }

  protected markAsTreated(reminderId: string): void {
    this.reminderService.markReminderAsDone(reminderId);
  }

  protected prepareReminder(reminder: ReminderSummary): void {
    this.reminderService.markReminderAsDone(reminder.id);
    this.router.navigate(['/'], {
      queryParams: {
        clientName: `${reminder.quote.clientFirstName} ${reminder.quote.clientLastName}`.trim(),
        service: reminder.quote.serviceDescription,
        amount: reminder.quote.amount,
        quoteDate: reminder.quote.sentAt,
        scenario: reminder.type
      }
    });
  }
}
