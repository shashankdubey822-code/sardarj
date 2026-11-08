"""Ingest and sync all products from Ezo_All_Items.csv and current catalog into database."""

import asyncio
import csv
import re
from typing import Any, Dict, List

from app.db.models import Base, Product
from app.db.session import get_engine, get_session_factory
from sqlalchemy import delete, select


def parse_final_cost(cost_str: str, sell_price: float, tax_pct: float) -> float:
    """Extract numeric final price from Ezo formatted string like '₹410 * (5% tax) = ₹430.5'."""
    if not cost_str:
        return round(sell_price * (1 + tax_pct / 100), 2)
    match = re.search(r"=\s*[₹Rs\.]*\s*([0-9\.]+)", cost_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return round(sell_price * (1 + tax_pct / 100), 2)


def load_ezo_csv(csv_path: str) -> List[Dict[str, Any]]:
    """Parse Ezo CSV export into standardized product dictionaries."""
    products = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("Item Name *", "").strip()
            if not name:
                continue
            category = row.get("Category", "General").strip()
            item_code = row.get("Sr", "").strip()

            # Sell price
            try:
                base_price = float(row.get("Sell Price *", "0").replace(",", "").strip())
            except ValueError:
                base_price = 0.0

            # Tax
            tax_str = row.get("Tax Percentage", "5%").replace("%", "").strip()
            try:
                tax_pct = float(tax_str) if tax_str else 5.0
            except ValueError:
                tax_pct = 5.0

            # Cost / Final price
            cost_str = row.get("Actual Cost to Customer", "")
            final_price = parse_final_cost(cost_str, base_price, tax_pct)

            # Current Stock
            stock_str = row.get("Current Stock", "0").strip()
            try:
                stock_qty = int(stock_str)
            except ValueError:
                stock_qty = 0

            # Determine size and color from name
            size = "Standard"
            color = "Standard"

            # Parse size tokens
            size_match = re.search(r"[\.\s]([0-9]{2}|[0-9]+/[0-9]+|[0-9]+/[0-9]+/[0-9]+|[SMLX]+)\b", name, re.IGNORECASE)
            if size_match:
                size = size_match.group(1).upper()
            elif " S" in name or ". S" in name:
                size = "Small"
            elif " M" in name or ". M" in name:
                size = "Medium"
            elif " L" in name or ". L" in name:
                size = "Large"

            # Parse color tokens
            if "BLU" in name.upper() or "BLUE" in name.upper():
                color = "Blue"
            elif "WT" in name.upper() or "WHITE" in name.upper():
                color = "White"
            elif "B S" in name.upper():
                color = "Black"

            products.append({
                "item_code": item_code,
                "name": name,
                "category": category,
                "color": color,
                "available_sizes": size,
                "base_price": base_price,
                "tax_percentage": tax_pct,
                "final_price": final_price,
                "stock_quantity": max(0, stock_qty),
                "description": f"{category} - {name} ({color}, Size: {size})",
                "is_in_stock": stock_qty > 0,
            })
    return products


# Additional inventory items from earlier input
ADDITIONAL_ITEMS: List[Dict[str, Any]] = [
    # T-Shirts
    {"item_code": "115", "name": "T-shirt.26", "category": "T-shirt", "color": "Standard", "available_sizes": "26", "base_price": 260.0, "tax_percentage": 5.0, "final_price": 273.0, "stock_quantity": 50, "description": "Comfort cotton school/casual T-shirt size 26.", "is_in_stock": True},
    {"item_code": "116", "name": "T-shirt.28", "category": "T-shirt", "color": "Standard", "available_sizes": "28", "base_price": 275.0, "tax_percentage": 5.0, "final_price": 288.75, "stock_quantity": 12, "description": "Comfort cotton school/casual T-shirt size 28.", "is_in_stock": True},
    {"item_code": "117", "name": "T-shirt.30", "category": "T-shirt", "color": "Standard", "available_sizes": "30", "base_price": 290.0, "tax_percentage": 5.0, "final_price": 304.5, "stock_quantity": 0, "description": "Comfort cotton school/casual T-shirt size 30.", "is_in_stock": False},
    {"item_code": "118", "name": "T-shirt.32", "category": "T-shirt", "color": "Standard", "available_sizes": "32", "base_price": 305.0, "tax_percentage": 5.0, "final_price": 320.25, "stock_quantity": 15, "description": "Comfort cotton school/casual T-shirt size 32.", "is_in_stock": True},
    {"item_code": "119", "name": "T-shirt.34", "category": "T-shirt", "color": "Standard", "available_sizes": "34", "base_price": 320.0, "tax_percentage": 5.0, "final_price": 336.0, "stock_quantity": 0, "description": "Comfort cotton school/casual T-shirt size 34.", "is_in_stock": False},
    {"item_code": "120", "name": "T-shirt.36", "category": "T-shirt", "color": "Standard", "available_sizes": "36", "base_price": 340.0, "tax_percentage": 5.0, "final_price": 357.0, "stock_quantity": 13, "description": "Comfort cotton school/casual T-shirt size 36.", "is_in_stock": True},
    {"item_code": "121", "name": "T-shirt.38", "category": "T-shirt", "color": "Standard", "available_sizes": "38", "base_price": 360.0, "tax_percentage": 5.0, "final_price": 378.0, "stock_quantity": 9, "description": "Comfort cotton school/casual T-shirt size 38.", "is_in_stock": True},
    {"item_code": "122", "name": "T-shirt.40", "category": "T-shirt", "color": "Standard", "available_sizes": "40", "base_price": 380.0, "tax_percentage": 5.0, "final_price": 399.0, "stock_quantity": 28, "description": "Comfort cotton school/casual T-shirt size 40.", "is_in_stock": True},
    {"item_code": "123", "name": "T-shirt.42", "category": "T-shirt", "color": "Standard", "available_sizes": "42", "base_price": 400.0, "tax_percentage": 5.0, "final_price": 420.0, "stock_quantity": 36, "description": "Comfort cotton school/casual T-shirt size 42.", "is_in_stock": True},
    # Tunics
    {"item_code": "124", "name": "T.24", "category": "Tunics", "color": "Standard", "available_sizes": "24", "base_price": 290.0, "tax_percentage": 5.0, "final_price": 304.5, "stock_quantity": 10, "description": "Tailored school uniform tunic size 24.", "is_in_stock": True},
    {"item_code": "125", "name": "T.26", "category": "Tunics", "color": "Standard", "available_sizes": "26", "base_price": 310.0, "tax_percentage": 5.0, "final_price": 325.5, "stock_quantity": 23, "description": "Tailored school uniform tunic size 26.", "is_in_stock": True},
    {"item_code": "126", "name": "T.28", "category": "Tunics", "color": "Standard", "available_sizes": "28", "base_price": 330.0, "tax_percentage": 5.0, "final_price": 346.5, "stock_quantity": 30, "description": "Tailored school uniform tunic size 28.", "is_in_stock": True},
    {"item_code": "127", "name": "T.30", "category": "Tunics", "color": "Standard", "available_sizes": "30", "base_price": 350.0, "tax_percentage": 5.0, "final_price": 367.5, "stock_quantity": 26, "description": "Tailored school uniform tunic size 30.", "is_in_stock": True},
    {"item_code": "128", "name": "T.32", "category": "Tunics", "color": "Standard", "available_sizes": "32", "base_price": 370.0, "tax_percentage": 5.0, "final_price": 388.5, "stock_quantity": 14, "description": "Tailored school uniform tunic size 32.", "is_in_stock": True},
    {"item_code": "129", "name": "T.34", "category": "Tunics", "color": "Standard", "available_sizes": "34", "base_price": 390.0, "tax_percentage": 5.0, "final_price": 409.5, "stock_quantity": 4, "description": "Tailored school uniform tunic size 34.", "is_in_stock": True},
    {"item_code": "130", "name": "T.36", "category": "Tunics", "color": "Standard", "available_sizes": "36", "base_price": 410.0, "tax_percentage": 5.0, "final_price": 430.5, "stock_quantity": 50, "description": "Tailored school uniform tunic size 36.", "is_in_stock": True},
    # Ties
    {"item_code": "131", "name": "T.L.48", "category": "Tie", "color": "Standard", "available_sizes": "Large (48)", "base_price": 80.0, "tax_percentage": 5.0, "final_price": 84.0, "stock_quantity": 16, "description": "Formal school tie - Large (48 inches).", "is_in_stock": True},
    {"item_code": "132", "name": "T.M.16", "category": "Tie", "color": "Standard", "available_sizes": "Medium (16)", "base_price": 60.0, "tax_percentage": 5.0, "final_price": 63.0, "stock_quantity": 27, "description": "Formal school tie - Medium (16 inches).", "is_in_stock": True},
    {"item_code": "133", "name": "T.S.14", "category": "Tie", "color": "Standard", "available_sizes": "Small (14)", "base_price": 60.0, "tax_percentage": 5.0, "final_price": 63.0, "stock_quantity": 43, "description": "Formal school tie - Small (14 inches).", "is_in_stock": True},
    # White Shoes
    {"item_code": "135", "name": "W S 1/2", "category": "Shoes", "color": "White", "available_sizes": "1/2", "base_price": 430.0, "tax_percentage": 5.0, "final_price": 451.5, "stock_quantity": 48, "description": "White school shoes size 1/2.", "is_in_stock": True},
    {"item_code": "136", "name": "W S 10/11", "category": "Shoes", "color": "White", "available_sizes": "10/11", "base_price": 400.0, "tax_percentage": 5.0, "final_price": 420.0, "stock_quantity": 45, "description": "White school shoes size 10/11.", "is_in_stock": True},
    {"item_code": "137", "name": "W S 12/13", "category": "Shoes", "color": "White", "available_sizes": "12/13", "base_price": 410.0, "tax_percentage": 5.0, "final_price": 430.5, "stock_quantity": 45, "description": "White school shoes size 12/13.", "is_in_stock": True},
    {"item_code": "138", "name": "W S 3/4", "category": "Shoes", "color": "White", "available_sizes": "3/4", "base_price": 445.0, "tax_percentage": 5.0, "final_price": 467.25, "stock_quantity": 47, "description": "White school shoes size 3/4.", "is_in_stock": True},
    {"item_code": "139", "name": "W S 5/6/7", "category": "Shoes", "color": "White", "available_sizes": "5/6/7", "base_price": 510.0, "tax_percentage": 5.0, "final_price": 535.5, "stock_quantity": 27, "description": "White school shoes size 5/6/7.", "is_in_stock": True},
    {"item_code": "140", "name": "W S 8/9/10", "category": "Shoes", "color": "White", "available_sizes": "8/9/10", "base_price": 575.0, "tax_percentage": 5.0, "final_price": 603.75, "stock_quantity": 46, "description": "White school shoes size 8/9/10.", "is_in_stock": True},
    # Tables
    {"item_code": "134", "name": "Table1", "category": "Table", "color": "Standard", "available_sizes": "Standard", "base_price": 450.0, "tax_percentage": 5.0, "final_price": 472.5, "stock_quantity": 50, "description": "Study table model 1.", "is_in_stock": True},
]


async def sync():
    csv_path = r"C:\Users\hp\Downloads\Ezo_All_Items.csv"
    ezo_items = load_ezo_csv(csv_path)

    # Merge by name to avoid duplicate
    merged: Dict[str, Dict[str, Any]] = {}
    for it in ADDITIONAL_ITEMS:
        merged[it["name"].lower()] = it
    for it in ezo_items:
        merged[it["name"].lower()] = it

    all_products = list(merged.values())

    # Write to local SQLite database
    factory = get_session_factory()
    async with factory() as session:
        # Clear existing
        await session.execute(delete(Product))
        for p in all_products:
            prod = Product(
                item_code=p.get("item_code"),
                name=p["name"],
                category=p["category"],
                color=p.get("color", "Standard"),
                available_sizes=p.get("available_sizes", "Standard"),
                base_price=p["base_price"],
                tax_percentage=p.get("tax_percentage", 5.0),
                final_price=p["final_price"],
                stock_quantity=p.get("stock_quantity", 0),
                description=p["description"],
                is_in_stock=p.get("is_in_stock", True),
            )
            session.add(prod)
        await session.commit()

    print(f"SUCCESS: Synchronized {len(all_products)} total products into database!")

    # Generate Supabase SQL file
    sql_lines = [
        "-- Bedi Fashion Supabase Migration Schema & Inventory Seed",
        "CREATE TABLE IF NOT EXISTS products (",
        "    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,",
        "    item_code VARCHAR(64),",
        "    name VARCHAR(128) NOT NULL,",
        "    category VARCHAR(64) NOT NULL,",
        "    color VARCHAR(32) DEFAULT 'Standard',",
        "    available_sizes VARCHAR(64) NOT NULL,",
        "    base_price NUMERIC(10, 2) NOT NULL,",
        "    tax_percentage NUMERIC(5, 2) DEFAULT 5.00,",
        "    final_price NUMERIC(10, 2) NOT NULL,",
        "    stock_quantity INT DEFAULT 0,",
        "    description TEXT,",
        "    image_url VARCHAR(256),",
        "    is_in_stock BOOLEAN DEFAULT TRUE,",
        "    created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS cart_items (",
        "    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,",
        "    sender_id VARCHAR(64) NOT NULL,",
        "    product_name VARCHAR(128) NOT NULL,",
        "    size VARCHAR(32) NOT NULL,",
        "    color VARCHAR(32) NOT NULL,",
        "    quantity INT DEFAULT 1,",
        "    price NUMERIC(10, 2) NOT NULL,",
        "    created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS b2b_inquiries (",
        "    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,",
        "    sender_id VARCHAR(64) NOT NULL,",
        "    company_name VARCHAR(128),",
        "    requirement TEXT NOT NULL,",
        "    estimated_quantity INT,",
        "    status VARCHAR(32) DEFAULT 'pending',",
        "    created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "-- Seed products",
        "TRUNCATE TABLE products RESTART IDENTITY;",
    ]

    for p in all_products:
        name_esc = p["name"].replace("'", "''")
        cat_esc = p["category"].replace("'", "''")
        col_esc = p.get("color", "Standard").replace("'", "''")
        size_esc = p.get("available_sizes", "Standard").replace("'", "''")
        desc_esc = p["description"].replace("'", "''")
        code_esc = p.get("item_code", "").replace("'", "''")
        in_stock_sql = "TRUE" if p.get("is_in_stock", True) else "FALSE"

        sql_lines.append(
            f"INSERT INTO products (item_code, name, category, color, available_sizes, base_price, tax_percentage, final_price, stock_quantity, description, is_in_stock) "
            f"VALUES ('{code_esc}', '{name_esc}', '{cat_esc}', '{col_esc}', '{size_esc}', {p['base_price']}, {p.get('tax_percentage', 5.0)}, {p['final_price']}, {p.get('stock_quantity', 0)}, '{desc_esc}', {in_stock_sql});"
        )

    with open("supabase_migration.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines) + "\n")

    print(f"SUCCESS: Generated supabase_migration.sql with {len(all_products)} records!")


if __name__ == "__main__":
    asyncio.run(sync())
