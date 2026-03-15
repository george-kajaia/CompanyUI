import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

const PWA_DISMISS_KEY = 'pwa-install-dismissed-at';

interface FaqItem { q: string; a: string; open: boolean; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  showInstallBanner = false;
  private deferredPrompt: any = null;
  private beforeInstallHandler = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e;
    if (!this.wasDismissedToday()) this.showInstallBanner = true;
  };

  faqs: FaqItem[] = [
    { q: 'What are service tokens?', a: 'Service tokens are digital vouchers issued by a company that customers can purchase, redeem for a specific service, or resell to others. They are entirely digital and require no physical logistics.', open: false },
    { q: 'How do I issue tokens for my company?', a: 'Register your company using the form on this page. Once approved, you will be onboarded to the platform where you can create and configure your service tokens.', open: false },
    { q: 'Can customers resell the tokens they purchase?', a: 'Yes. Customers have full flexibility to either redeem their tokens for your service or resell them to other buyers on the platform.', open: false },
    { q: 'Is my company data secure on this platform?', a: 'All data is encrypted in transit and at rest. We never share your information with third parties, and our infrastructure meets GDPR compliance requirements.', open: false },
    { q: 'What types of services are supported?', a: 'Service Tokens is cross-industry. Any service business — from fitness studios to consulting firms — can issue tokens.', open: false },
    { q: 'How long does company registration take?', a: 'The registration form takes under two minutes. Our team will review your submission and follow up within 24 hours.', open: false },
  ];

  year = new Date().getFullYear();

  ngOnInit(): void {
    window.addEventListener('beforeinstallprompt', this.beforeInstallHandler);
    window.addEventListener('appinstalled', () => {
      this.showInstallBanner = false;
      this.deferredPrompt = null;
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.beforeInstallHandler);
  }

  toggleFaq(item: FaqItem): void { item.open = !item.open; }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') this.showInstallBanner = false;
    this.deferredPrompt = null;
  }

  dismissBanner(): void {
    this.showInstallBanner = false;
    localStorage.setItem(PWA_DISMISS_KEY, new Date().toDateString());
  }

  private wasDismissedToday(): boolean {
    return localStorage.getItem(PWA_DISMISS_KEY) === new Date().toDateString();
  }
}
