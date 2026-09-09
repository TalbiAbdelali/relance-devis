import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page.component';
import { RemindersPageComponent } from './reminders-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'rappels', component: RemindersPageComponent },
  { path: '**', redirectTo: '' }
];
