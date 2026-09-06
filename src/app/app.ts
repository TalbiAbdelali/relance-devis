import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuoteRequest, Tone } from './quote-request.model';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly formBuilder = inject(FormBuilder);
  private readonly storageKey = 'relance-devis-history';
  protected readonly tones: { value: Tone; label: string; description: string }[] = [
    { value: 'professionnel', label: 'Professionnel', description: 'Clair, posé et rassurant' },
    { value: 'amical', label: 'Amical', description: 'Chaleureux et humain' },
    { value: 'direct', label: 'Direct', description: 'Court et efficace' }
  ];
  protected readonly quoteForm = this.formBuilder.nonNullable.group({
    clientName: ['', [Validators.required, Validators.minLength(2)]], service: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]], quoteDate: [this.today(), Validators.required],
    tone: ['professionnel' as Tone, Validators.required]
  });
  protected readonly message = signal('');
  protected readonly copiedNotice = signal('');
  protected readonly history = signal<QuoteRequest[]>(this.loadHistory());
  protected readonly hasMessage = computed(() => this.message().length > 0);

  protected generateMessage(): void {
    if (this.quoteForm.invalid) { this.quoteForm.markAllAsTouched(); return; }
    const request = new QuoteRequest(this.quoteForm.getRawValue());
    const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(request.amount);
    const formattedDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${request.quoteDate}T12:00:00`));
    const messages: Record<Tone, string> = {
      professionnel: `Bonjour ${request.clientName},\n\nJe me permets de revenir vers vous concernant le devis pour ${request.service}, d'un montant de ${formattedAmount}, envoyé le ${formattedDate}.\n\nAvez-vous pu en prendre connaissance ? Je reste à votre disposition pour répondre à vos questions et convenir de la suite.\n\nBien cordialement,`,
      amical: `Bonjour ${request.clientName} !\n\nJe voulais savoir si vous aviez eu le temps de regarder mon devis pour ${request.service} (${formattedAmount}), envoyé le ${formattedDate}.\n\nDites-moi si vous avez la moindre question, je serai ravi d'en discuter avec vous.\n\nÀ bientôt,`,
      direct: `Bonjour ${request.clientName},\n\nAvez-vous validé le devis de ${formattedAmount} pour ${request.service}, envoyé le ${formattedDate} ?\n\nJe peux démarrer dès que vous me confirmez votre accord.`
    };
    this.message.set(messages[request.tone]); this.copiedNotice.set('');
    this.history.update((items) => { const updated = [request, ...items.filter((item) => item.id !== request.id)].slice(0, 5); this.saveHistory(updated); return updated; });
  }

  protected async copyMessage(): Promise<void> {
    if (!this.message()) return;
    await navigator.clipboard.writeText(this.message()); this.showCopied('Message copié');
  }

  protected openWhatsapp(): void {
    if (this.message()) window.open(`https://wa.me/?text=${encodeURIComponent(this.message())}`, '_blank', 'noopener');
  }

  protected copyForEmail(): void {
    if (!this.message()) return;
    const subject = `Relance devis - ${this.quoteForm.controls.service.value}`;
    void navigator.clipboard.writeText(`Objet : ${subject}\n\n${this.message()}`); this.showCopied('Email copié');
  }

  protected restore(request: QuoteRequest): void {
    this.quoteForm.setValue({ clientName: request.clientName, service: request.service, amount: request.amount, quoteDate: request.quoteDate, tone: request.tone });
    this.generateMessage();
  }

  private showCopied(notice: string): void { this.copiedNotice.set(notice); window.setTimeout(() => this.copiedNotice.set(''), 2500); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private loadHistory(): QuoteRequest[] {
    try { const stored = localStorage.getItem(this.storageKey); const parsed: unknown = stored ? JSON.parse(stored) : []; return Array.isArray(parsed) ? parsed.slice(0, 5) as QuoteRequest[] : []; } catch { return []; }
  }
  private saveHistory(items: QuoteRequest[]): void { localStorage.setItem(this.storageKey, JSON.stringify(items)); }
}
