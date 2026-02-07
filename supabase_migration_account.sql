-- 1. Create Enum for Product Type
ALTER TABLE products 
ADD COLUMN product_type text DEFAULT 'manual'; -- 'manual', 'link', 'account'

-- 2. Add Config Columns to Products
ALTER TABLE products 
ADD COLUMN account_config jsonb DEFAULT '{}'::jsonb, -- Stores field definitions & template
ADD COLUMN prefix_code text;

-- 3. Create Account Stocks Table
CREATE TABLE account_stocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    account_data jsonb NOT NULL, -- Flexible data (email, pass, pin, etc.)
    is_sold boolean DEFAULT false,
    sold_at timestamp with time zone,
    sold_to text, -- Buyer Email
    transaction_id text, -- PREFIX-RANDOM
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Index for faster FIFO retrieval
CREATE INDEX idx_account_stocks_fifo ON account_stocks(product_id, created_at) WHERE is_sold = false;
