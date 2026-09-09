import { Routes } from '@angular/router';
import { HomePageComponent } from './features/home/home-page.component';
import { RemindersPageComponent } from './features/reminders/reminders-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'rappels', component: RemindersPageComponent },
  { path: '**', redirectTo: '' }
];
