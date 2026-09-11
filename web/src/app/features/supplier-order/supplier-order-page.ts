import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { OrdersService } from '../../core/services/orders.service';
import { CloudFunctionsService } from '../../core/services/cloud-functions.service';

const MESI_ITALIANO = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

@Component({
  selector: 'app-supplier-order-page',
  templateUrl: './supplier-order-page.html',
  styleUrl: './supplier-order-page.css',
})
export class SupplierOrderPage {
  private readonly ordersService = inject(OrdersService);
  private readonly cloudFunctions = inject(CloudFunctionsService);

  private readonly now = new Date();
  protected readonly month = this.now.getMonth() + 1;
  protected readonly year = this.now.getFullYear();
  protected readonly monthLabel = MESI_ITALIANO[this.month - 1];
  private readonly currentOrderId = `${this.year}-${String(this.month).padStart(2, '0')}`;

  private readonly refreshTrigger = signal(0);

  protected readonly currentOrder = toSignal(
    toObservable(this.refreshTrigger).pipe(switchMap(() => this.ordersService.get(this.currentOrderId))),
    { initialValue: undefined }
  );

  protected readonly history = toSignal(this.ordersService.listRecent(), { initialValue: undefined });

  protected readonly alreadySent = computed(() => this.currentOrder()?.status === 'inviato');

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  monthName(m: number): string {
    return MESI_ITALIANO[m - 1];
  }

  async send(): Promise<void> {
    this.error.set(null);
    this.success.set(null);
    this.sending.set(true);
    try {
      const result = await this.cloudFunctions.sendSupplierOrder({ month: this.month, year: this.year });
      this.success.set(`Ordine inviato: ${result.data.mealsCount} pasti.`);
      this.refreshTrigger.update((n) => n + 1);
    } catch {
      this.error.set('Invio non riuscito (forse già inviato questo mese, o errore di rete).');
    } finally {
      this.sending.set(false);
    }
  }
}
