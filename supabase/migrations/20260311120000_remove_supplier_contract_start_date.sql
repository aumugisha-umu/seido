-- Remove start_date from supplier_contracts
-- Supplier contracts don't need a start date (unlike leases)
ALTER TABLE supplier_contracts DROP COLUMN start_date;
