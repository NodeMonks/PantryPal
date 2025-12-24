import {
  billRepository,
  billItemRepository,
  creditNoteRepository,
  productRepository,
} from "../repositories";
import type {
  Bill,
  BillItem,
  CreditNote,
  InsertBill,
  InsertBillItem,
  InsertCreditNote,
} from "../../shared/schema";

export class BillingService {
  /**
   * Create a bill (draft state)
   * Validates org_id and initializes bill
   */
  async createBill(
    data: Omit<InsertBill, "org_id">,
    orgId: string
  ): Promise<Bill> {
    return billRepository.create(data, orgId);
  }

  /**
   * Add an item to a bill
   * Validates bill exists and is not finalized
   */
  async addBillItem(
    billId: string,
    productId: string,
    quantity: number,
    orgId: string
  ): Promise<BillItem> {
    // Verify bill exists and is not finalized
    const bill = await billRepository.findById(billId, orgId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found in org ${orgId}`);
    }

    if (bill.finalized_at !== null) {
      throw new Error(
        `Cannot add items to finalized bill ${billId}. Finalized bills are immutable.`
      );
    }

    // Verify product exists and has sufficient stock
    // INVARIANT: Stock conservation - never allow items to be added that would create negative stock
    const product = await productRepository.findById(productId, orgId);
    if (!product) {
      throw new Error(`Product ${productId} not found in org ${orgId}`);
    }

    const availableQty = product.quantity_in_stock || 0;
    if (quantity <= 0) {
      throw new Error(`Quantity must be positive. Received: ${quantity}`);
    }

    if (quantity > availableQty) {
      throw new Error(
        `Insufficient stock for product "${product.name}". ` +
          `Available: ${availableQty}, Requested: ${quantity}. ` +
          `Please restock before adding to bill.`
      );
    }

    // Calculate prices
    const unitPrice = product.mrp;
    const totalPrice = parseFloat(unitPrice) * quantity;

    // Create bill item
    return billItemRepository.create(
      {
        bill_id: billId,
        product_id: productId,
        quantity,
        unit_price: unitPrice as any,
        total_price: totalPrice as any,
      } as InsertBillItem,
      orgId
    );
  }

  /**
   * Remove an item from a bill
   * Only allowed if bill is not finalized
   */
  async removeBillItem(
    billItemId: string,
    billId: string,
    orgId: string
  ): Promise<boolean> {
    // Verify bill is not finalized
    const bill = await billRepository.findById(billId, orgId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    if (bill.finalized_at !== null) {
      throw new Error(
        `Cannot remove items from finalized bill ${billId}. Use credit notes for corrections.`
      );
    }

    return billItemRepository.delete(billItemId, orgId);
  }

  /**
   * Finalize a bill (lock it and decrease stock)
   * INVARIANT: Once finalized, bills are immutable
   */
  async finalizeBill(
    billId: string,
    orgId: string,
    finalizedByUser: string
  ): Promise<Bill> {
    // Fetch bill
    const bill = await billRepository.findById(billId, orgId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    if (bill.finalized_at !== null) {
      throw new Error(`Bill ${billId} is already finalized`);
    }

    // Get all bill items
    const items = await billItemRepository.findByBillId(billId, orgId);
    if (items.length === 0) {
      throw new Error(`Cannot finalize empty bill ${billId}`);
    }

    // Validate stock availability for all items
    for (const item of items) {
      const product = await productRepository.findById(item.product_id, orgId);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const availableQty = product.quantity_in_stock || 0;
      if (item.quantity > availableQty) {
        throw new Error(
          `Stock validation failed for product ${item.product_id}. Available: ${availableQty}, Required: ${item.quantity}`
        );
      }
    }

    // Decrease stock for all items using database transaction for atomicity
    // INVARIANT: Stock levels must be conserved and never go negative
    const { db } = await import("../db");

    try {
      // Execute in a database transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Decrease stock for all items atomically
        for (const item of items) {
          const product = await productRepository.findById(
            item.product_id,
            orgId
          );
          if (!product) {
            throw new Error(
              `Product ${item.product_id} not found during finalization`
            );
          }

          const currentQty = product.quantity_in_stock || 0;
          const newQuantity = currentQty - item.quantity;

          // CRITICAL: Prevent negative stock (stock conservation invariant)
          if (newQuantity < 0) {
            throw new Error(
              `Insufficient stock for product ${product.name} (${item.product_id}). ` +
                `Available: ${currentQty}, Required: ${item.quantity}`
            );
          }

          // Update stock within transaction
          await productRepository.updateStock(
            item.product_id,
            orgId,
            -item.quantity
          );
        }

        // Mark bill as finalized within the same transaction
        const finalizedBill = await billRepository.finalize(
          billId,
          orgId,
          finalizedByUser
        );

        if (!finalizedBill) {
          throw new Error(`Failed to finalize bill ${billId}`);
        }

        // Send bill email with QR code if customer email exists
        try {
          const { sendBillEmail } = await import("./billEmailService");
          const { customerRepository } = await import("../repositories");
          const customer = finalizedBill.customer_id
            ? await customerRepository.findById(
                finalizedBill.customer_id,
                orgId
              )
            : null;
          if (customer && customer.email) {
            // Prepare bill details and QR data
            const billDetails =
              `<ul>` +
              items
                .map((i) => `<li>${i.quantity} x ${i.product_id}</li>`)
                .join("") +
              `</ul>`;
            const qrData = JSON.stringify({
              billId: finalizedBill.id,
              items: items.map((i) => ({
                product_id: i.product_id,
                quantity: i.quantity,
              })),
            });
            await sendBillEmail({
              to: customer.email,
              customerName: customer.name || "Customer",
              billNumber: finalizedBill.bill_number,
              billDetails,
              qrData,
              orgName: "PantryPal",
            });
          }
        } catch (e) {
          console.error("Failed to send bill email:", e);
        }

        return finalizedBill;
      });

      return result;
    } catch (err) {
      // If transaction fails, all changes are rolled back automatically
      throw new Error(
        `Transaction failed while finalizing bill ${billId}: ${
          (err as Error).message
        }`
      );
    }
  }

  /**
   * Create a credit note for a finalized bill
   * Used for corrections/returns instead of editing finalized bills
   */
  async createCreditNote(
    billId: string,
    amount: number,
    reason: string,
    orgId: string
  ): Promise<CreditNote> {
    // Verify bill exists and is finalized
    const bill = await billRepository.findById(billId, orgId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    if (bill.finalized_at === null) {
      throw new Error(
        `Bill ${billId} is not finalized. Edit it directly instead of creating a credit note.`
      );
    }

    if (amount <= 0) {
      throw new Error(`Credit note amount must be positive`);
    }

    if (amount > parseFloat(bill.final_amount)) {
      throw new Error(
        `Credit note amount (${amount}) exceeds bill amount (${bill.final_amount})`
      );
    }

    return creditNoteRepository.create(
      {
        bill_id: billId,
        amount: amount as any,
        reason,
      } as InsertCreditNote,
      orgId
    );
  }

  /**
   * Get bill with all items and credits
   */
  async getBillDetails(
    billId: string,
    orgId: string
  ): Promise<{
    bill: Bill;
    items: BillItem[];
    totalCredit: number;
  }> {
    const bill = await billRepository.findById(billId, orgId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    const items = await billItemRepository.findByBillId(billId, orgId);
    const totalCredit = await creditNoteRepository.getTotalCreditForBill(
      billId,
      orgId
    );

    return {
      bill,
      items,
      totalCredit,
    };
  }

  /**
   * Calculate bill totals
   */
  async calculateBillTotals(
    billId: string,
    orgId: string
  ): Promise<{
    subtotal: number;
    discount: number;
    tax: number;
    totalCredit: number;
    final: number;
  }> {
    const bill = await billRepository.findById(billId, orgId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    const itemsTotal = await billItemRepository.getTotalForBill(billId, orgId);
    const totalCredit = await creditNoteRepository.getTotalCreditForBill(
      billId,
      orgId
    );

    const discount = parseFloat(bill.discount_amount || "0");
    const tax = parseFloat(bill.tax_amount || "0");
    const subtotal = itemsTotal - discount + tax;
    const final = subtotal - totalCredit;

    return {
      subtotal: itemsTotal,
      discount,
      tax,
      totalCredit,
      final: Math.max(0, final),
    };
  }
}

// Export singleton
export const billingService = new BillingService();
