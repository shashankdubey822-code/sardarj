import csv
import re

csv_path = r"C:\Users\hp\Downloads\Ezo_All_Items.csv"
with open(csv_path, mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    items = list(reader)

print(f"Total rows in Ezo CSV: {len(items)}")
for it in items:
    name = it.get("Item Name *", "").strip()
    cat = it.get("Category", "").strip()
    sell = it.get("Sell Price *", "").strip()
    cost = it.get("Actual Cost to Customer", "").strip()
    stock = it.get("Current Stock", "").strip()
    print(f"[{cat}] {name} | Sell: {sell} | Cost: {cost} | Stock: {stock}")
