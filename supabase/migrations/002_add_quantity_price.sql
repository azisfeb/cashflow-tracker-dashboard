-- Add quantity and price columns to transactions
-- quantity: number of units (default 1, must be positive)
-- price: unit price (nullable — legacy rows and direct-amount entries leave this NULL)
-- amount remains the authoritative total; UI computes amount = quantity * price when price is set

alter table public.transactions
  add column quantity integer not null default 1 check (quantity > 0),
  add column price numeric(15, 2) null;

-- Back-fill price for existing rows: price = amount / quantity (quantity is always 1 for legacy rows)
-- This ensures existing rows have a consistent price value when edited via the UI.
-- We intentionally leave price NULL for legacy rows so the UI shows the direct-amount entry path.
-- (No back-fill needed — NULL price = user enters amount directly, which is correct for existing data.)

comment on column public.transactions.quantity is 'Number of units purchased/received; default 1';
comment on column public.transactions.price is 'Unit price; when set, amount is derived as quantity * price in the UI';
