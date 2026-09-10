import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuoteRequest, RelanceScenario, Scenario } from '../../shared/models/quote-request.model';
import { QuoteReminderService } from '../../core/services/quote-reminder.service';
import { DevisStatus } from '../../shared/models/quote.model';

type EmailProvider = 'default' | 'gmail' | 'outlook' | 'yahoo' | 'icloud';

@Component({
  selector: 'app-home-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class HomePageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly reminderService = inject(QuoteReminderService);
  private readonly storageKey = 'relance-devis-history';

  protected readonly emailProviders: Array<{ id: EmailProvider; label: string; description: string }> = [
    { id: 'default', label: 'Client mail par défaut', description: 'Ouvre votre application de messagerie' },
    { id: 'gmail', label: 'Gmail', description: 'Composer via Gmail' },
    { id: 'outlook', label: 'Outlook', description: 'Composer via Outlook' },
    { id: 'yahoo', label: 'Yahoo Mail', description: 'Composer via Yahoo Mail' },
    { id: 'icloud', label: 'iCloud Mail', description: 'Composer via iCloud Mail' }
  ];

  protected readonly scenarios: Scenario[] = [
    { id: 'FIRST_REMINDER', label: 'Première relance', icon: '📩', description: 'Le client n’a pas encore répondu' },
    { id: 'AFTER_7_DAYS', label: 'Relance après 7 jours', icon: '🗓️', description: 'Une semaine sans réponse' },
    { id: 'SECOND_REMINDER', label: 'Deuxième relance', icon: '🔁', description: 'Après une première relance' },
    { id: 'LAST_REMINDER', label: 'Dernière relance', icon: '⚠️', description: 'Dernière tentative avant abandon' },
    { id: 'HESITANT_CLIENT', label: 'Client hésitant', icon: '🤝', description: 'Le client semble intéressé mais hésite' }
  ];

  protected readonly quoteForm = this.formBuilder.nonNullable.group({
    clientName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿ' -]{2,}$/)]],
    service: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'&/().,-]{3,}$/)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    quoteDate: [this.today(), [Validators.required, this.futureDateValidator()]],
    scenario: ['FIRST_REMINDER' as RelanceScenario, Validators.required]
  });

  protected readonly message = signal('');
  protected readonly copiedNotice = signal('');
  protected readonly emailChoiceOpen = signal(false);
  protected readonly history = signal<QuoteRequest[]>(this.loadHistory());
  protected readonly reminderCount = computed(() => this.reminderService.getReminderCount());
  protected readonly hasMessage = computed(() => this.message().length > 0);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.applyPrefillFromQuery(params);
    });
  }

  protected selectScenario(scenarioId: RelanceScenario): void {
    this.quoteForm.controls.scenario.setValue(scenarioId);
    if (this.hasMessage()) {
      this.generateMessage();
    }
  }

  protected generateMessage(): void {
    if (this.quoteForm.invalid) {
      this.quoteForm.markAllAsTouched();
      return;
    }

    const request = new QuoteRequest(this.quoteForm.getRawValue());
    const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(request.amount);
    const formattedDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${request.quoteDate}T12:00:00`));
    const message = this.buildScenarioMessage(request, formattedAmount, formattedDate);

    this.message.set(message);
    this.copiedNotice.set('');
    this.reminderService.saveQuote(this.toQuote(request));

    this.history.update((items) => {
      const updated = [request, ...items.filter((item) => item.id !== request.id)].slice(0, 5);
      this.saveHistory(updated);
      return updated;
    });
  }

  protected async copyMessage(): Promise<void> {
    if (!this.message()) return;
    await navigator.clipboard.writeText(this.message());
    this.showCopied('Message copié');
  }

  protected openWhatsapp(): void {
    if (this.message()) {
      window.open(`https://wa.me/?text=${encodeURIComponent(this.message())}`, '_blank', 'noopener');
    }
  }

  protected openEmailDialog(): void {
    if (!this.message()) return;
    this.emailChoiceOpen.set(true);
  }

  protected closeEmailDialog(): void {
    this.emailChoiceOpen.set(false);
  }

  protected chooseEmailProvider(provider: EmailProvider): void {
    if (!this.message()) return;

    const subject = `Relance devis - ${this.quoteForm.controls.service.value}`;
    const body = this.message();
    const url = this.buildEmailUrl(provider, subject, body);

    this.emailChoiceOpen.set(false);

    if (provider === 'default') {
      window.location.href = url;
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  protected restore(request: QuoteRequest): void {
    this.quoteForm.setValue({
      clientName: request.clientName,
      service: request.service,
      amount: request.amount,
      quoteDate: request.quoteDate,
      scenario: request.scenario
    });
    this.generateMessage();
  }

  private applyPrefillFromQuery(params: URLSearchParams | Map<string, string> | { get: (key: string) => string | null }): void {
    const clientName = params.get('clientName');
    const service = params.get('service');
    const amount = params.get('amount');
    const quoteDate = params.get('quoteDate');
    const scenario = params.get('scenario');

    if (!clientName && !service && !amount && !quoteDate && !scenario) {
      return;
    }

    this.quoteForm.patchValue({
      clientName: clientName ?? '',
      service: service ?? '',
      amount: amount ? Number(amount) : 0,
      quoteDate: quoteDate ?? this.today(),
      scenario: (scenario as RelanceScenario) ?? 'FIRST_REMINDER'
    });

    this.generateMessage();
  }

  private toQuote(request: QuoteRequest) {
    const now = new Date().toISOString();
    const quote: import('../../shared/models/quote.model').Quote = {
      id: request.id,
      clientFirstName: request.clientName.split(' ')[0] ?? request.clientName,
      clientLastName: request.clientName.split(' ').slice(1).join(' ') || 'Client',
      clientEmail: '',
      serviceDescription: request.service,
      amount: request.amount,
      sentAt: request.quoteDate,
      lastContactAt: request.quoteDate,
      status: 'PENDING' as DevisStatus,
      remindersCount: 0,
      createdAt: now
    };
    return quote;
  }

  private buildScenarioMessage(request: QuoteRequest, formattedAmount: string, formattedDate: string): string {
    const signature = 'Votre nom';
    const scenario = request.scenario ?? 'FIRST_REMINDER';
    const scenarioMessages: Record<RelanceScenario, string> = {
      FIRST_REMINDER: `Bonjour ${request.clientName},\n\nJe me permets de revenir vers vous concernant le devis pour ${request.service}, d'un montant de ${formattedAmount}, envoyé le ${formattedDate}.\n\nAvez-vous eu le temps d'en prendre connaissance ?\n\nJe reste bien entendu disponible si vous avez la moindre question.\n\nBien cordialement,\n\n${signature}`,
      AFTER_7_DAYS: `Bonjour ${request.clientName},\n\nJe me permets de revenir vers vous concernant le devis pour ${request.service}, d'un montant de ${formattedAmount}, envoyé le ${formattedDate}.\n\nSans retour de votre part, je souhaitais simplement savoir si votre projet était toujours d'actualité.\n\nJe reste disponible pour échanger avec vous.\n\nBien cordialement,\n\n${signature}`,
      SECOND_REMINDER: `Bonjour ${request.clientName},\n\nJe me permets de vous recontacter une nouvelle fois concernant votre devis pour ${request.service}.\n\nJe souhaitais savoir si vous aviez pu avancer dans votre réflexion ou si certains points nécessitaient des précisions.\n\nN'hésitez pas à me contacter, je reste à votre disposition.\n\nBien cordialement,\n\n${signature}`,
      LAST_REMINDER: `Bonjour ${request.clientName},\n\nJe me permets une dernière relance concernant le devis de ${formattedAmount} pour ${request.service}.\n\nSans retour de votre part, nous considérerons que votre projet n'est peut-être plus d'actualité.\n\nSi vous souhaitez toujours avancer, n'hésitez pas à revenir vers nous afin que nous puissions en discuter.\n\nBien cordialement,\n\n${signature}`,
      HESITANT_CLIENT: `Bonjour ${request.clientName},\n\nSuite à nos derniers échanges concernant votre projet, je souhaitais savoir si vous aviez encore des questions ou des hésitations concernant notre proposition.\n\nNous pouvons bien sûr échanger ensemble afin de trouver la solution la plus adaptée à vos besoins.\n\nJe reste à votre disposition.\n\nBien cordialement,\n\n${signature}`
    };
    return scenarioMessages[scenario];
  }

  private buildEmailUrl(provider: EmailProvider, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    switch (provider) {
      case 'gmail':
        return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedSubject}&body=${encodedBody}`;
      case 'outlook':
        return `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodedSubject}&body=${encodedBody}`;
      case 'yahoo':
        return `https://compose.mail.yahoo.com/?subject=${encodedSubject}&body=${encodedBody}`;
      case 'icloud':
        return `https://www.icloud.com/mail/?view=cm&subject=${encodedSubject}&body=${encodedBody}`;
      case 'default':
      default:
        return `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
    }
  }

  private showCopied(notice: string): void {
    this.copiedNotice.set(notice);
    window.setTimeout(() => this.copiedNotice.set(''), 2500);
  }

  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const selectedDate = new Date(`${value}T12:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return selectedDate > today ? { futureDate: true } : null;
    };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private loadHistory(): QuoteRequest[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? (parsed.slice(0, 5) as QuoteRequest[]) : [];
    } catch {
      return [];
    }
  }

  private saveHistory(items: QuoteRequest[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}
