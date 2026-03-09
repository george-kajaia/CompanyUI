import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CompanyStateService } from '../../../core/state/company-state.service';
import { RequestApiService } from '../../../core/api/request-api.service';
import { ProductApiService } from '../../../core/api/product-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';

import { Company } from '../../../shared/models/company.model';
import { Request, RequestStatus } from '../../../shared/models/request.model';
import { Product, SchedulePeriodType } from '../../../shared/models/product.model';
import { RequestDto } from '../../../shared/models/dtos.model';

type CompanyTab = 'requests' | 'products';
type ModalMode =
  | 'none'
  | 'requestView'
  | 'requestAdd'
  | 'requestEdit'
  | 'productView'
  | 'productAdd'
  | 'productEdit';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './company-dashboard.component.html',
  styleUrls: ['./company-dashboard.component.scss']
})
export class CompanyDashboardComponent implements OnInit {
  company: Company | null = null;

  activeTab: CompanyTab = 'requests';

  // Requests tab state
  requests: Request[] = [];
  requestsLoading = false;
  selectedRequest: Request | null = null;

  // Products tab state
  products: Product[] = [];
  productsLoading = false;
  selectedProduct: Product | null = null;

  // Products query state (API does not expose CompanyId filter; we filter client-side)
  productSearch = '';
  productSkip = 0;
  productTake = 200;

  // Modal state
  modalOpen = false;
  modalMode: ModalMode = 'none';
  modalTitle = '';
  modalLoading = false;
  modalError = '';

  modalRequest: Request | null = null;
  modalProduct: Product | null = null;

  // Forms
  requestForm: RequestDto = { companyId: 0, productId: 0, serviceTokenCount: 1 };
  requestFormProductIdManual: number | null = null;

  productForm: Product = {
    id: 0,
    companyId: 0,
    name: '',
    serviceCount: 0,
    price: 0,
    term: null,
    scheduleType: { periodType: SchedulePeriodType.None, periodNumber: null }
  };

  private toast = inject(ToastService);
  private dialog = inject(DialogService);

  constructor(
    private router: Router,
    private companyState: CompanyStateService,
    private requestApi: RequestApiService,
    private productApi: ProductApiService
  ) {}

  ngOnInit(): void {
    this.company = this.companyState.company;

    if (!this.company) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadRequests();
    this.reloadProducts();
  }

  setTab(tab: CompanyTab) {
    this.activeTab = tab;
  }

  // -----------------------------
  // Requests
  // -----------------------------
  loadRequests(silent = false) {
    if (!this.company) return;

    this.requestsLoading = true;
    this.selectedRequest = null;

    this.requestApi.getAll(this.company.id, RequestStatus.None).subscribe({
      next: data => {
        this.requests = data ?? [];
        this.requestsLoading = false;
      },
      error: err => {
        console.error(err);
        this.requestsLoading = false;
        if (!silent) {
          this.toast.errorWithRetry(
            'Failed to load requests. Please check your connection.',
            () => this.loadRequests()
          );
        }
      }
    });
  }

  selectRequest(r: Request) {
    this.selectedRequest = r;
  }

  onRequestView() {
    if (!this.selectedRequest) return;

    this.openModal('requestView', 'Request details');
    // We already have the request object from the grid; show it directly.
    this.modalRequest = { ...this.selectedRequest };
  }

  onRequestAdd() {
    if (!this.company) return;

    this.requestForm = { companyId: this.company.id, productId: 0, serviceTokenCount: 1 };
    this.requestFormProductIdManual = null;
    this.openModal('requestAdd', 'Add new request');
  }

  submitRequestAdd() {
    if (!this.company) return;

    const productId =
      (this.requestFormProductIdManual ?? 0) > 0 ? (this.requestFormProductIdManual as number) : this.requestForm.productId;

    if (!productId || productId <= 0) {
      this.modalError = 'Please select or enter a valid Product Id.';
      return;
    }

    const dto: RequestDto = { companyId: this.company.id, productId, serviceTokenCount: this.requestForm.serviceTokenCount };

    this.modalLoading = true;
    this.modalError = '';

    this.requestApi.create(dto).subscribe({
      next: _ => {
        this.modalLoading = false;
        this.closeModal();
        this.loadRequests(true);
        this.toast.success('Request created successfully.');
      },
      error: err => {
        console.error(err);
        this.modalLoading = false;

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  onRequestEdit() {
    if (!this.company || !this.selectedRequest) return;

    this.requestForm = {
      companyId: this.company.id,
      productId: this.selectedRequest.productId,
      serviceTokenCount: this.selectedRequest.serviceTokenCount
    };
    this.requestFormProductIdManual = null;
    this.openModal('requestEdit', 'Edit request');
  }

  submitRequestEdit() {
    if (!this.company || !this.selectedRequest) return;

    const productId = this.requestForm.productId;
    if (!productId || productId <= 0) {
      this.modalError = 'Please select a valid Product Id.';
      return;
    }

    if (!this.requestForm.serviceTokenCount || this.requestForm.serviceTokenCount <= 0) {
      this.modalError = 'Please enter a valid Service Token Count.';
      return;
    }

    const dto: RequestDto = {
      companyId: this.company.id,
      productId,
      serviceTokenCount: this.requestForm.serviceTokenCount
    };

    this.modalLoading = true;
    this.modalError = '';

    this.requestApi.update(this.selectedRequest.id, this.selectedRequest.rowVersion, dto).subscribe({
      next: _ => {
        this.modalLoading = false;
        this.closeModal();
        this.loadRequests(true);
        this.toast.success('Request updated successfully.');
      },
      error: err => {
        this.modalLoading = false;

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  async onRequestDelete() {
    if (!this.selectedRequest) return;

    const confirmed = await this.dialog.confirm({
      title: 'Delete Request',
      message: `Are you sure you want to delete request #${this.selectedRequest.id}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;

    this.requestsLoading = true;

    this.requestApi.delete(this.selectedRequest.id, this.selectedRequest.rowVersion).subscribe({
      next: _ => {
        this.requestsLoading = false;
        this.selectedRequest = null;
        this.loadRequests(true);
        this.toast.success('Request deleted successfully.');
      },
      error: err => {
        this.requestsLoading = false;

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  // Row-level workflow actions (per request record)
  authorizeRequestRow(r: Request, event?: Event) {
    event?.stopPropagation();
    if (Number(r.status) !== RequestStatus.Created) return;

    this.requestsLoading = true;

    this.requestApi.authorize(r.id, r.rowVersion).subscribe({
      next: updated => {
        this.requestsLoading = false;
        this.patchRequestInList(updated);
        this.toast.success('Request authorized.');
      },
      error: err => {
        console.error(err);
        this.requestsLoading = false;
        
        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  deauthorizeRequestRow(r: Request, event?: Event) {
    event?.stopPropagation();
    if (Number(r.status) !== RequestStatus.Authorised) return;

    this.requestsLoading = true;

    this.requestApi.deauthorize(r.id, r.rowVersion).subscribe({
      next: updated => {
        this.requestsLoading = false;
        this.patchRequestInList(updated);
        this.toast.success('Request deauthorized.');
      },
      error: err => {
        console.error(err);
        this.requestsLoading = false;

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  private patchRequestInList(updated: Request | null | undefined) {
    // Some backend actions may return an empty body (null) even though the request was updated.
    // In that case, fall back to reloading the list instead of crashing the UI.
    if (!updated || (updated as any).id == null) {
      this.loadRequests();
      return;
    }

    // Defensive: ensure there are no null items in the local list.
    this.requests = (this.requests ?? []).filter((x): x is Request => !!x && (x as any).id != null);

    const idx = this.requests.findIndex(x => x.id === updated.id);
    if (idx >= 0) {
      this.requests[idx] = updated;
    } else {
      this.requests = [updated, ...this.requests];
    }

    if (this.selectedRequest?.id === updated.id) {
      this.selectedRequest = updated;
    }
  }

  // -----------------------------
  // Products
  // -----------------------------
  reloadProducts(silent = false) {
    if (!this.company) return;

    this.productSkip = 0;
    this.products = [];
    this.selectedProduct = null;
    this.loadProductsPage(true, silent);
  }

  loadProductsPage(resetSelection: boolean = false, silent = false) {
    if (!this.company) return;

    if (resetSelection) this.selectedProduct = null;
    this.productsLoading = true;

    this.productApi.getAll(this.productSkip, this.productTake, this.productSearch || null).subscribe({
      next: data => {
        const all = data ?? [];
        const mine = all.filter(p => p.companyId === this.company!.id);

        // Append while avoiding duplicates by id (in case of server-side ordering changes)
        const existing = new Map(this.products.map(p => [p.id, p]));
        for (const p of mine) existing.set(p.id, p);

        this.products = Array.from(existing.values()).sort((a, b) => a.id - b.id);
        this.productsLoading = false;
      },
      error: err => {
        console.error(err);
        this.productsLoading = false;
        if (!silent) {
          this.toast.errorWithRetry(
            'Failed to load products. Please check your connection.',
            () => this.loadProductsPage(false)
          );
        }
      }
    });
  }

  loadMoreProducts() {
    this.productSkip += this.productTake;
    this.loadProductsPage(false);
  }

  selectProduct(p: Product) {
    this.selectedProduct = p;
  }

  onProductView() {
    if (!this.selectedProduct) return;

    this.openModal('productView', 'Product details');
    this.modalLoading = true;

    this.productApi.getById(this.selectedProduct.id).subscribe({
      next: prod => {
        this.modalProduct = prod;
        this.modalLoading = false;
      },
      error: err => {
        console.error(err);
        this.modalLoading = false;
        this.closeModal();

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  onProductAdd() {
    if (!this.company) return;

    this.productForm = {
      id: 0,
      companyId: this.company.id,
      name: '',
      serviceCount: 0,
      price: 0,
      term: null,
      scheduleType: { periodType: SchedulePeriodType.None, periodNumber: null }
    };

    this.openModal('productAdd', 'Add new product');
  }

  submitProductAdd() {
    if (!this.company) return;

    this.modalLoading = true;
    this.modalError = '';

    const payload: Product = {
      ...this.productForm,
      companyId: this.company.id
    };

    this.productApi.create(payload).subscribe({
      next: _ => {
        this.modalLoading = false;
        this.closeModal();
        this.reloadProducts(true);
        this.toast.success('Product created successfully.');
      },
      error: err => {
        console.error(err);
        this.modalLoading = false;

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  onProductEdit() {
    if (!this.selectedProduct) return;
    this.openProductEdit(this.selectedProduct.id);
  }

  private openProductEdit(productId: number) {
    this.openModal('productEdit', 'Edit product');
    this.modalLoading = true;

    this.productApi.getById(productId).subscribe({
      next: prod => {
        const term = prod.term === undefined ? null : prod.term;
        const scheduleType = prod.scheduleType ?? { periodType: SchedulePeriodType.None, periodNumber: null };
        this.productForm = { ...prod, term: term as any, scheduleType };
        this.modalLoading = false;
      },
      error: err => {
        console.error(err);
        this.modalLoading = false;
        this.closeModal();
        
        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  submitProductEdit() {
    if (!this.company) return;

    this.modalLoading = true;
    this.modalError = '';

    const productId = this.productForm.id;

    // Ensure companyId is preserved
    const payload: Product = { ...this.productForm, companyId: this.company.id };

    this.productApi.update(productId, payload).subscribe({
      next: _ => {
        this.modalLoading = false;
        this.closeModal();
        this.reloadProducts(true);
        // If edit was invoked from Requests tab, refresh Requests as well (productId referenced there)
        this.loadRequests(true);
        this.toast.success('Product updated successfully.');
      },
      error: err => {
        console.error(err);
        this.modalLoading = false;
        
        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  async onProductDelete() {
    if (!this.selectedProduct) return;

    const productId = this.selectedProduct.id;
    const confirmed = await this.dialog.confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete product #${productId}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;

    this.productsLoading = true;

    this.productApi.delete(productId).subscribe({
      next: _ => {
        this.productsLoading = false;
        this.selectedProduct = null;
        this.reloadProducts(true);
        this.loadRequests(true);
        this.toast.success('Product deleted successfully.');
      },
      error: err => {
        console.error(err);
        this.productsLoading = false;

        const message = typeof err.error === 'string' ? err.error : err.error?.message;
        this.toast.error(message);
      }
    });
  }

  // -----------------------------
  // Modal helpers
  // -----------------------------
  openModal(mode: ModalMode, title: string) {
    this.modalOpen = true;
    this.modalMode = mode;
    this.modalTitle = title;

    this.modalLoading = false;
    this.modalError = '';

    this.modalRequest = null;
    this.modalProduct = null;
  }

  closeModal() {
    this.modalOpen = false;
    this.modalMode = 'none';
    this.modalTitle = '';
    this.modalLoading = false;
    this.modalError = '';
    this.modalRequest = null;
    this.modalProduct = null;
  }

  // -----------------------------
  // Display helpers
  // -----------------------------
  requestStatusLabel(status: number): string {
    switch (status) {
      case RequestStatus.None:
        return 'None';
      case RequestStatus.Created:
        return 'Created';
      case RequestStatus.Authorised:
        return 'Authorised';
      case RequestStatus.Approved:
        return 'Approved';
      default:
        return `Status ${status}`;
    }
  }

  scheduleTypeLabel(periodType: number, periodNumber?: number | null): string {
    const label = this.schedulePeriodLabel(periodType);
    if (!periodNumber || periodNumber <= 0) return label;
    return `${label} / ${periodNumber}`;
  }

  schedulePeriodLabel(value: number): string {
    switch (value) {
      case SchedulePeriodType.None:
        return 'None';
      case SchedulePeriodType.Daily:
        return 'Daily';
      case SchedulePeriodType.Weekly:
        return 'Weekly';
      case SchedulePeriodType.Monthly:
        return 'Monthly';
      case SchedulePeriodType.Yearly:
        return 'Yearly';
      default:
        return `Period ${value}`;
    }
  }
}
