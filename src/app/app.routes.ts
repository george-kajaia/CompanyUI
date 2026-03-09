import { Routes } from '@angular/router';
import { CompanyLoginComponent } from './features/auth/company-login/company-login.component';
import { CompanyDashboardComponent } from './features/company/dashboard/company-dashboard.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: CompanyLoginComponent },
  { path: 'dashboard', component: CompanyDashboardComponent },
  { path: '**', redirectTo: 'login' }
];
