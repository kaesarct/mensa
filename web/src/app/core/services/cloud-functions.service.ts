import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface RegisterTopUpRequest {
  studentId: string;
  familyId: string;
  amount: number;
  bonificoRef: string;
  documentPath?: string;
  date: string; // ISO date
}

export interface RegisterUsageRequest {
  studentId: string;
  familyId: string;
  quantity: number;
  classSection: string;
  note?: string;
  date: string; // ISO date
}

export interface SendSupplierOrderRequest {
  month: number; // 1-12
  year: number;
}

/**
 * Wrapper delle callable Cloud Functions già implementate in
 * functions/src/callable/*.ts — la validazione e l'autorizzazione vivono lì
 * (mai fidarsi del client), qui si tipizzano solo request/response.
 */
@Injectable({ providedIn: 'root' })
export class CloudFunctionsService {
  private readonly functions = inject(Functions);

  registerTopUp(data: RegisterTopUpRequest) {
    return httpsCallable<RegisterTopUpRequest, { topUpId: string }>(this.functions, 'registerTopUp')(data);
  }

  registerUsage(data: RegisterUsageRequest) {
    return httpsCallable<RegisterUsageRequest, { usageId: string }>(this.functions, 'registerUsage')(data);
  }

  sendSupplierOrder(data: SendSupplierOrderRequest) {
    return httpsCallable<SendSupplierOrderRequest, { orderId: string; mealsCount: number }>(
      this.functions,
      'sendSupplierOrder'
    )(data);
  }
}
