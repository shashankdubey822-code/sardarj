"""Official Bedi Fashion inventory catalog dataset and seeder."""

from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product

CATALOG_ITEMS: List[Dict[str, Any]] = [
    # T-Shirts
    {"item_code": "115", "name": "T-shirt.26", "category": "T-shirt", "available_sizes": "26", "base_price": 260.0, "tax_percentage": 5.0, "final_price": 273.0, "stock_quantity": 50, "description": "Comfort cotton school/casual T-shirt size 26."},
    {"item_code": "116", "name": "T-shirt.28", "category": "T-shirt", "available_sizes": "28", "base_price": 275.0, "tax_percentage": 5.0, "final_price": 288.75, "stock_quantity": 12, "description": "Comfort cotton school/casual T-shirt size 28."},
    {"item_code": "117", "name": "T-shirt.30", "category": "T-shirt", "available_sizes": "30", "base_price": 290.0, "tax_percentage": 5.0, "final_price": 304.5, "stock_quantity": 0, "description": "Comfort cotton school/casual T-shirt size 30 (currently out of stock)."},
    {"item_code": "118", "name": "T-shirt.32", "category": "T-shirt", "available_sizes": "32", "base_price": 305.0, "tax_percentage": 5.0, "final_price": 320.25, "stock_quantity": 15, "description": "Comfort cotton school/casual T-shirt size 32."},
    {"item_code": "119", "name": "T-shirt.34", "category": "T-shirt", "available_sizes": "34", "base_price": 320.0, "tax_percentage": 5.0, "final_price": 336.0, "stock_quantity": 0, "description": "Comfort cotton school/casual T-shirt size 34 (currently out of stock)."},
    {"item_code": "120", "name": "T-shirt.36", "category": "T-shirt", "available_sizes": "36", "base_price": 340.0, "tax_percentage": 5.0, "final_price": 357.0, "stock_quantity": 13, "description": "Comfort cotton school/casual T-shirt size 36."},
    {"item_code": "121", "name": "T-shirt.38", "category": "T-shirt", "available_sizes": "38", "base_price": 360.0, "tax_percentage": 5.0, "final_price": 378.0, "stock_quantity": 9, "description": "Comfort cotton school/casual T-shirt size 38."},
    {"item_code": "122", "name": "T-shirt.40", "category": "T-shirt", "available_sizes": "40", "base_price": 380.0, "tax_percentage": 5.0, "final_price": 399.0, "stock_quantity": 28, "description": "Comfort cotton school/casual T-shirt size 40."},
    {"item_code": "123", "name": "T-shirt.42", "category": "T-shirt", "available_sizes": "42", "base_price": 400.0, "tax_percentage": 5.0, "final_price": 420.0, "stock_quantity": 36, "description": "Comfort cotton school/casual T-shirt size 42."},

    # Tunics
    {"item_code": "124", "name": "T.24", "category": "Tunics", "available_sizes": "24", "base_price": 290.0, "tax_percentage": 5.0, "final_price": 304.5, "stock_quantity": 10, "description": "Tailored school/uniform tunic size 24."},
    {"item_code": "125", "name": "T.26", "category": "Tunics", "available_sizes": "26", "base_price": 310.0, "tax_percentage": 5.0, "final_price": 325.5, "stock_quantity": 23, "description": "Tailored school/uniform tunic size 26."},
    {"item_code": "126", "name": "T.28", "category": "Tunics", "available_sizes": "28", "base_price": 330.0, "tax_percentage": 5.0, "final_price": 346.5, "stock_quantity": 30, "description": "Tailored school/uniform tunic size 28."},
    {"item_code": "127", "name": "T.30", "category": "Tunics", "available_sizes": "30", "base_price": 350.0, "tax_percentage": 5.0, "final_price": 367.5, "stock_quantity": 26, "description": "Tailored school/uniform tunic size 30."},
    {"item_code": "128", "name": "T.32", "category": "Tunics", "available_sizes": "32", "base_price": 370.0, "tax_percentage": 5.0, "final_price": 388.5, "stock_quantity": 14, "description": "Tailored school/uniform tunic size 32."},
    {"item_code": "129", "name": "T.34", "category": "Tunics", "available_sizes": "34", "base_price": 390.0, "tax_percentage": 5.0, "final_price": 409.5, "stock_quantity": 4, "description": "Tailored school/uniform tunic size 34."},
    {"item_code": "130", "name": "T.36", "category": "Tunics", "available_sizes": "36", "base_price": 410.0, "tax_percentage": 5.0, "final_price": 430.5, "stock_quantity": 50, "description": "Tailored school/uniform tunic size 36."},

    # Ties
    {"item_code": "131", "name": "T.L.48", "category": "Tie", "available_sizes": "Large (48)", "base_price": 80.0, "tax_percentage": 5.0, "final_price": 84.0, "stock_quantity": 16, "description": "Formal school tie - Large (48 inches)."},
    {"item_code": "132", "name": "T.M.16", "category": "Tie", "available_sizes": "Medium (16)", "base_price": 60.0, "tax_percentage": 5.0, "final_price": 63.0, "stock_quantity": 27, "description": "Formal school tie - Medium (16 inches)."},
    {"item_code": "133", "name": "T.S.14", "category": "Tie", "available_sizes": "Small (14)", "base_price": 60.0, "tax_percentage": 5.0, "final_price": 63.0, "stock_quantity": 43, "description": "Formal school tie - Small (14 inches)."},

    # Tables
    {"item_code": "134", "name": "Table1", "category": "Table", "available_sizes": "Standard", "base_price": 450.0, "tax_percentage": 5.0, "final_price": 472.5, "stock_quantity": 50, "description": "Classroom study table model 1."},

    # Shoes
    {"item_code": "135", "name": "W S 1/2", "category": "Shoes", "available_sizes": "1/2", "base_price": 430.0, "tax_percentage": 5.0, "final_price": 451.5, "stock_quantity": 48, "description": "School uniform footwear size 1/2."},
    {"item_code": "136", "name": "W S 10/11", "category": "Shoes", "available_sizes": "10/11", "base_price": 400.0, "tax_percentage": 5.0, "final_price": 420.0, "stock_quantity": 45, "description": "School uniform footwear size 10/11."},
    {"item_code": "137", "name": "W S 12/13", "category": "Shoes", "available_sizes": "12/13", "base_price": 410.0, "tax_percentage": 5.0, "final_price": 430.5, "stock_quantity": 45, "description": "School uniform footwear size 12/13."},
    {"item_code": "138", "name": "W S 3/4", "category": "Shoes", "available_sizes": "3/4", "base_price": 445.0, "tax_percentage": 5.0, "final_price": 467.25, "stock_quantity": 47, "description": "School uniform footwear size 3/4."},
    {"item_code": "139", "name": "W S 5/6/7", "category": "Shoes", "available_sizes": "5/6/7", "base_price": 510.0, "tax_percentage": 5.0, "final_price": 535.5, "stock_quantity": 27, "description": "School uniform footwear size 5/6/7."},
    {"item_code": "140", "name": "W S 8/9/10", "category": "Shoes", "available_sizes": "8/9/10", "base_price": 575.0, "tax_percentage": 5.0, "final_price": 603.75, "stock_quantity": 46, "description": "School uniform footwear size 8/9/10."},
]


async def seed_catalog_if_empty(session: AsyncSession) -> int:
    """Populate database with default product catalog if empty.

    Args:
        session: Active asynchronous database session.

    Returns:
        int: Number of products seeded.
    """
    result = await session.execute(select(Product).limit(1))
    if result.scalars().first() is not None:
        return 0

    count = 0
    for item in CATALOG_ITEMS:
        prod = Product(
            item_code=item["item_code"],
            name=item["name"],
            category=item["category"],
            color="Standard",
            available_sizes=item["available_sizes"],
            base_price=item["base_price"],
            tax_percentage=item["tax_percentage"],
            final_price=item["final_price"],
            stock_quantity=item["stock_quantity"],
            description=item["description"],
            is_in_stock=item["stock_quantity"] > 0,
        )
        session.add(prod)
        count += 1
    await session.commit()
    return count
