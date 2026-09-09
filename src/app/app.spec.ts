import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { QuoteReminderService } from './core/services/quote-reminder.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the quote follow-up form', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.ngZone?.run(() => TestBed.inject(Router).initialNavigation());
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Transformez vos devis');
    expect(compiled.textContent).toContain('Générer ma relance');
  });

  it('should render the scenario cards for relance situations', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.ngZone?.run(() => TestBed.inject(Router).initialNavigation());
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Choisissez votre situation');
    expect(compiled.textContent).toContain('Première relance');
    expect(compiled.textContent).toContain('Client hésitant');
  });

  it('should keep processed reminders in a dedicated list', () => {
    const service = new QuoteReminderService();
    const pending = service.getPendingReminders();

    expect(pending.length).toBeGreaterThan(0);

    const reminderId = pending[0].id;
    service.markReminderAsDone(reminderId);

    expect(service.getPendingReminders().some((reminder) => reminder.id === reminderId)).toBeFalse();
    expect(service.getProcessedReminders().some((reminder) => reminder.id === reminderId)).toBeTrue();
  });

  it('should show the treated reminders section on the reminder page', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.ngZone?.run(() => TestBed.inject(Router).navigateByUrl('/rappels'));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Déjà traités');
  });
});
