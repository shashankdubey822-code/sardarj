import sqlite3

def export_products():
    conn = sqlite3.connect("whatsapp_bot.db")
    cur = conn.cursor()
    cur.execute("""
        SELECT item_code, name, category, color, available_sizes, base_price,
               tax_percentage, final_price, stock_quantity, description, is_in_stock
        FROM products
    """)
    rows = cur.fetchall()
    conn.close()

    val_lines = []
    for r in rows:
        item_code = f"'{r[0]}'" if r[0] is not None else "NULL"
        name = r[1].replace("'", "''")
        category = r[2].replace("'", "''")
        color = r[3].replace("'", "''")
        sizes = r[4].replace("'", "''")
        base_price = r[5]
        tax = r[6]
        final_price = r[7]
        stock = r[8]
        desc = r[9].replace("'", "''")
        in_stock = "TRUE" if r[10] else "FALSE"
        val_lines.append(
            f"({item_code}, '{name}', '{category}', '{color}', '{sizes}', {base_price}, {tax}, {final_price}, {stock}, '{desc}', {in_stock})"
        )

    sql = (
        "TRUNCATE TABLE products RESTART IDENTITY;\n"
        "INSERT INTO products (item_code, name, category, color, available_sizes, base_price, tax_percentage, final_price, stock_quantity, description, is_in_stock) VALUES\n"
        + ",\n".join(val_lines)
        + ";\n"
    )

    with open("supabase_seed_all.sql", "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"Successfully generated supabase_seed_all.sql with {len(rows)} items.")

if __name__ == "__main__":
    export_products()
