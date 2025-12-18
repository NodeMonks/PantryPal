import { customerRepository } from "../repositories";
import type { Customer, InsertCustomer } from "../../shared/schema";

export class CustomerService {
  /**
   * Create a new customer
   */
  async createCustomer(data: InsertCustomer, orgId: string): Promise<Customer> {
    // Check for duplicate email if provided
    if (data.email) {
      const existing = await customerRepository.findByEmail(data.email, orgId);
      if (existing) {
        throw new Error(`Customer with email ${data.email} already exists`);
      }
    }

    // Check for duplicate phone if provided
    if (data.phone) {
      const existing = await customerRepository.findByPhone(data.phone, orgId);
      if (existing) {
        throw new Error(`Customer with phone ${data.phone} already exists`);
      }
    }

    return customerRepository.create(data, orgId);
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    customerId: string,
    data: Partial<Omit<Customer, "id" | "org_id" | "created_at">>,
    orgId: string
  ): Promise<Customer | null> {
    // Verify customer exists
    const customer = await customerRepository.findById(customerId, orgId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Validate email uniqueness if changing
    if (data.email && data.email !== customer.email) {
      const existing = await customerRepository.findByEmail(data.email, orgId);
      if (existing) {
        throw new Error(`Customer with email ${data.email} already exists`);
      }
    }

    // Validate phone uniqueness if changing
    if (data.phone && data.phone !== customer.phone) {
      const existing = await customerRepository.findByPhone(data.phone, orgId);
      if (existing) {
        throw new Error(`Customer with phone ${data.phone} already exists`);
      }
    }

    return customerRepository.update(
      customerId,
      data as Partial<Customer>,
      orgId
    );
  }

  /**
   * Get customer by ID
   */
  async getCustomer(
    customerId: string,
    orgId: string
  ): Promise<Customer | null> {
    return customerRepository.findById(customerId, orgId);
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string, orgId: string): Promise<Customer | null> {
    return customerRepository.findByEmail(email, orgId);
  }

  /**
   * Find customer by phone
   */
  async findByPhone(phone: string, orgId: string): Promise<Customer | null> {
    return customerRepository.findByPhone(phone, orgId);
  }

  /**
   * List all customers for an org
   */
  async listCustomers(orgId: string): Promise<Customer[]> {
    return customerRepository.findAll(orgId);
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: string, orgId: string): Promise<boolean> {
    // Verify customer exists
    const customer = await customerRepository.findById(customerId, orgId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Note: Consider soft-delete or checking for active bills before deletion
    return customerRepository.delete(customerId, orgId);
  }

  /**
   * Search customers by name, email, or phone
   */
  async searchCustomers(
    searchTerm: string,
    orgId: string
  ): Promise<Customer[]> {
    const allCustomers = await customerRepository.findAll(orgId);

    const searchLower = searchTerm.toLowerCase();
    return allCustomers.filter((c: Customer) => {
      return (
        c.name.toLowerCase().includes(searchLower) ||
        (c.email && c.email.toLowerCase().includes(searchLower)) ||
        (c.phone && c.phone.includes(searchTerm))
      );
    });
  }
}

// Export singleton
export const customerService = new CustomerService();
