# PDVMarket Cloud - Supabase Database Setup

Copy and paste the content of each section into the Supabase SQL Editor and run it.

## 1. Tables

This script creates all the necessary tables for the application.

```sql
-- Create a table for market information if you plan to support multiple markets
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default market for single-tenant use
INSERT INTO markets (name) VALUES ('Minha Loja');

-- Create a table for public user profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('owner', 'operator')),
    market_id INTEGER NOT NULL REFERENCES markets(id)
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES markets(id),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES markets(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT UNIQUE,
    points INTEGER DEFAULT 0,
    credit_limit NUMERIC(10, 2) DEFAULT 0,
    credit_balance NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES markets(id),
    order_number SERIAL,
    items JSONB,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    received NUMERIC(10, 2),
    change NUMERIC(10, 2),
    status TEXT NOT NULL,
    operator_id UUID NOT NULL REFERENCES profiles(id),
    operator_name TEXT NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    discount JSONB
);

-- Customer Transactions table
CREATE TABLE customer_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    related_sale_id INTEGER REFERENCES sales(id),
    notes TEXT
);

-- Expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES markets(id),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cashier Sessions table
CREATE TABLE cashier_sessions (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES markets(id),
    operator_id UUID NOT NULL REFERENCES profiles(id),
    operator_name TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    opening_balance NUMERIC(10, 2) NOT NULL,
    closing_balance NUMERIC(10, 2),
    calculated_sales_total NUMERIC(10, 2) DEFAULT 0,
    calculated_closing_balance NUMERIC(10, 2),
    difference NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'open'
);

-- Cashier Transactions table
CREATE TABLE cashier_transactions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES cashier_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

```

## 2. Row Level Security (RLS)

This is crucial for security. It ensures that users can only access data belonging to their own market.

```sql
-- Enable RLS for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's market_id
CREATE OR REPLACE FUNCTION get_my_market_id()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT market_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- RLS Policies
-- Users can see their own profile
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Users can only manage data within their own market
CREATE POLICY "Market data isolation" ON products
FOR ALL USING (market_id = get_my_market_id());

CREATE POLICY "Market data isolation" ON customers
FOR ALL USING (market_id = get_my_market_id());

CREATE POLICY "Market data isolation" ON sales
FOR ALL USING (market_id = get_my_market_id());

CREATE POLICY "Market data isolation" ON expenses
FOR ALL USING (market_id = get_my_market_id());

CREATE POLICY "Market data isolation" ON cashier_sessions
FOR ALL USING (market_id = get_my_market_id());

-- For joined tables, the policy needs to check the parent table's market_id
CREATE POLICY "Market data isolation for customer transactions" ON customer_transactions
FOR ALL USING (
  (SELECT market_id FROM customers WHERE id = customer_id) = get_my_market_id()
);

CREATE POLICY "Market data isolation for cashier transactions" ON cashier_transactions
FOR ALL USING (
  (SELECT market_id FROM cashier_sessions WHERE id = session_id) = get_my_market_id()
);

```

## 3. Database Functions (RPC)

These functions handle complex logic on the database side, which is more efficient and secure.

```sql
-- Function to create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder. In a real app, you would have a way to assign market_id.
  -- For now, we'll assign them to the first market.
  INSERT INTO public.profiles (id, name, type, market_id)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'type', 1);
  RETURN new;
END;
$$;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Function to safely update customer points
CREATE OR REPLACE FUNCTION update_customer_points(p_customer_id INT, p_points_change INT, p_customer_data JSONB)
RETURNS SETOF customers
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update other customer data if provided
    IF p_customer_data IS NOT NULL THEN
        UPDATE customers
        SET
            name = COALESCE(p_customer_data->>'name', name),
            email = COALESCE(p_customer_data->>'email', email),
            phone = COALESCE(p_customer_data->>'phone', phone),
            cpf = COALESCE(p_customer_data->>'cpf', cpf),
            credit_limit = COALESCE((p_customer_data->>'credit_limit')::numeric, credit_limit)
        WHERE id = p_customer_id;
    END IF;

    -- Update points
    UPDATE customers
    SET points = points + p_points_change
    WHERE id = p_customer_id;

    RETURN QUERY SELECT * FROM customers WHERE id = p_customer_id;
END;
$$;

-- Function to handle a customer payment and update balance
CREATE OR REPLACE FUNCTION add_customer_payment(p_customer_id INT, p_amount NUMERIC)
RETURNS SETOF customers
LANGUAGE plpgsql
AS $$
DECLARE
  updated_balance NUMERIC;
BEGIN
    UPDATE customers
    SET credit_balance = credit_balance - p_amount
    WHERE id = p_customer_id
    RETURNING credit_balance INTO updated_balance;

    -- Prevent negative balance from payments
    IF updated_balance < 0 THEN
      UPDATE customers SET credit_balance = 0 WHERE id = p_customer_id;
    END IF;

    INSERT INTO customer_transactions(customer_id, type, amount, notes)
    VALUES (p_customer_id, 'payment', p_amount, 'Pagamento recebido');

    RETURN QUERY SELECT * FROM customers WHERE id = p_customer_id;
END;
$$;


-- Function to update stock when a sale status is changed to 'completed'
CREATE OR REPLACE FUNCTION update_stock_from_sale(sale_id_arg INT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    sale_items JSONB;
    item RECORD;
BEGIN
    SELECT items INTO sale_items FROM sales WHERE id = sale_id_arg;
    FOR item IN SELECT * FROM jsonb_to_recordset(sale_items) AS x(id INT, qty INT)
    LOOP
        UPDATE products
        SET stock = stock - item.qty
        WHERE id = item.id;
    END LOOP;
END;
$$;


-- Function to close a cashier session
CREATE OR REPLACE FUNCTION close_cashier(p_session_id INT, p_closing_balance NUMERIC)
RETURNS SETOF cashier_sessions
LANGUAGE plpgsql
AS $$
DECLARE
    v_suprimentos NUMERIC;
    v_sangrias NUMERIC;
    v_sales_in_cash NUMERIC;
    v_all_sales_total NUMERIC;
    v_opening_balance NUMERIC;
    v_calculated_closing NUMERIC;
    v_difference NUMERIC;
BEGIN
    SELECT opening_balance INTO v_opening_balance FROM cashier_sessions WHERE id = p_session_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_suprimentos FROM cashier_transactions WHERE session_id = p_session_id AND type = 'suprimento';
    SELECT COALESCE(SUM(amount), 0) INTO v_sangrias FROM cashier_transactions WHERE session_id = p_session_id AND type = 'sangria';
    SELECT COALESCE(SUM(amount), 0) INTO v_sales_in_cash FROM cashier_transactions WHERE session_id = p_session_id AND type = 'sale' AND payment_method = 'money';
    SELECT COALESCE(SUM(amount), 0) INTO v_all_sales_total FROM cashier_transactions WHERE session_id = p_session_id AND type = 'sale';

    v_calculated_closing := v_opening_balance + v_sales_in_cash + v_suprimentos - v_sangrias;
    v_difference := p_closing_balance - v_calculated_closing;

    UPDATE cashier_sessions
    SET
        status = 'closed',
        end_time = NOW(),
        closing_balance = p_closing_balance,
        calculated_closing_balance = v_calculated_closing,
        calculated_sales_total = v_all_sales_total,
        difference = v_difference
    WHERE id = p_session_id;

    RETURN QUERY SELECT * FROM cashier_sessions WHERE id = p_session_id;
END;
$$;


-- A comprehensive function to create a sale and handle all related logic in one transaction
CREATE OR REPLACE FUNCTION create_sale(
    p_market_id INT,
    p_operator_id UUID,
    p_operator_name TEXT,
    p_customer_id INT,
    p_customer_name TEXT,
    p_items JSONB,
    p_total NUMERIC,
    p_payment_method TEXT,
    p_received NUMERIC,
    p_change NUMERIC,
    p_status TEXT,
    p_discount JSONB
)
RETURNS SETOF sales
LANGUAGE plpgsql
AS $$
DECLARE
    new_sale_id INT;
    item RECORD;
    points_earned INT;
    points_used INT;
BEGIN
    -- 1. Create the sale record
    INSERT INTO sales(market_id, operator_id, operator_name, customer_id, customer_name, items, total, payment_method, received, change, status, discount)
    VALUES (p_market_id, p_operator_id, p_operator_name, p_customer_id, p_customer_name, p_items, p_total, p_payment_method, p_received, p_change, p_status, p_discount)
    RETURNING id INTO new_sale_id;

    -- 2. Update product stock
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id INT, qty INT)
    LOOP
        UPDATE products
        SET stock = stock - item.qty
        WHERE id = item.id;
    END LOOP;

    -- 3. Handle customer-related logic if a customer is attached
    IF p_customer_id IS NOT NULL THEN
        -- a. Handle credit account sales
        IF p_payment_method = 'credit_account' THEN
            UPDATE customers
            SET credit_balance = credit_balance + p_total
            WHERE id = p_customer_id;
            
            INSERT INTO customer_transactions(customer_id, type, amount, related_sale_id)
            VALUES (p_customer_id, 'purchase', p_total, new_sale_id);
        END IF;

        -- b. Handle points redemption
        IF p_discount IS NOT NULL AND p_discount->>'type' = 'points' THEN
            points_used := (p_discount->>'amount')::numeric / 0.10; -- Assuming POINTS_TO_BRL_RATE = 0.10
            UPDATE customers
            SET points = points - points_used
            WHERE id = p_customer_id;
        END IF;

        -- c. Award points for the purchase
        points_earned := floor(p_total);
        UPDATE customers
        SET points = points + points_earned
        WHERE id = p_customer_id;
    END IF;

    -- 4. Return the newly created sale
    RETURN QUERY SELECT * FROM sales WHERE id = new_sale_id;
END;
$$;

```
## 4. Final Touches
1.  Go to **Authentication -> Providers** and enable the **Email** provider.
2.  (Optional) Go to **Authentication -> Settings** and disable "Enable email confirmations" for easier testing.
3.  Go to the **Users** tab and add your 'owner' and 'operator' users manually. When you add them, you can add `{"name": "Dono da Loja", "type": "owner"}` to the **User Metadata** field. This will trigger the `handle_new_user` function to create their profile.
4.  Make sure you have added some products, etc. in the Supabase table editor to test with.
