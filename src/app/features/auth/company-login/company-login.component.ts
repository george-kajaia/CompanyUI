import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CompanyApiService } from '../../../core/api/company-api.service';
import { CompanyStateService } from '../../../core/state/company-state.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-company-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './company-login.component.html',
  styleUrls: ['./company-login.component.scss']
})
export class CompanyLoginComponent implements OnInit {
  isRegisterMode = false;

  loginModel = { userName: '', password: '' };
  registerModel = { name: '', taxCode: '', userName: '', password: '' };

  loading = false;
  private toast = inject(ToastService);

  constructor(
    private companyApi: CompanyApiService,
    private companyState: CompanyStateService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Auto-switch to register mode if ?mode=register
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'register') {
        this.isRegisterMode = true;
      }
    });
  }

  toggleMode() { this.isRegisterMode = !this.isRegisterMode; }

  onLogin() {
    this.loading = true;
    this.companyApi.login(this.loginModel).subscribe({
      next: companyUser => {
        this.companyState.companyUser = companyUser;
        this.companyApi.getById(companyUser.companyId).subscribe({
          next: company => {
            this.loading = false;
            this.companyState.company = company;
            this.router.navigate(['/dashboard']);
          },
          error: err => { this.loading = false; this.toast.error(err.error?.message ?? err.error); }
        });
      },
      error: err => { this.loading = false; this.toast.error(err.error?.message ?? err.error); }
    });
  }

  onRegister() {
    this.loading = true;
    this.companyApi.register(this.registerModel).subscribe({
      next: _ => {
        this.loading = false;
        this.toast.success('Registration successful! You can now login with your credentials.');
        this.isRegisterMode = false;
      },
      error: err => { this.loading = false; this.toast.error(err.error?.message ?? err.error); }
    });
  }
}
