"""Knowledge retrieval service (RAG & Product Catalog lookups)."""

import re
from typing import Any, Dict, List
from sqlalchemy import or_, select

from app.core.logging import get_logger
from app.db.models import Product
from app.db.session import get_session_factory

logger = get_logger(__name__)


async def retrieve(query: str) -> List[Dict[str, Any]]:
    """Retrieve relevant product catalog knowledge for customer queries.

    Args:
        query: Customer message text.

    Returns:
        List[Dict[str, Any]]: Matching product records with exact pricing and stock.
    """
    clean_query = query.lower().strip()
    factory = get_session_factory()
    results: List[Dict[str, Any]] = []

    try:
        async with factory() as session:
            # Check for keyword matches
            conditions = []
            if any(k in clean_query for k in ["t-shirt", "tshirt", "t shirt"]):
                conditions.append(Product.category.ilike("%t-shirt%"))
            if any(k in clean_query for k in ["tunic", "tuinic", "t."]):
                conditions.append(Product.category.ilike("%tunic%"))
            if any(k in clean_query for k in ["tie"]):
                conditions.append(Product.category.ilike("%tie%"))
            if any(k in clean_query for k in ["shoe", "footwear", "b s", "w s"]):
                conditions.append(Product.category.ilike("%shoe%"))
            if any(k in clean_query for k in ["coat", "blazer"]):
                conditions.append(Product.category.ilike("%coat%"))
            if any(k in clean_query for k in ["belt"]) and not any(k in clean_query for k in ["pant"]):
                conditions.append(Product.category == "Belt")
            if any(k in clean_query for k in ["pant", "trouser", "bp", "bp."]):
                conditions.append(Product.category.ilike("%pant%"))
            if any(k in clean_query for k in ["divider", "devider"]):
                conditions.append(Product.category.ilike("%devider%"))
            if any(k in clean_query for k in ["cycling", "short"]):
                conditions.append(Product.category.ilike("%cycling%"))
            if any(k in clean_query for k in ["table"]):
                conditions.append(Product.category.ilike("%table%"))

            # Check for size numbers in query
            sizes_found = re.findall(r"\b(14|16|24|26|28|30|32|34|36|38|40|42|48)\b", clean_query)
            for size in sizes_found:
                conditions.append(Product.available_sizes.contains(size))

            if conditions:
                stmt = select(Product).where(or_(*conditions)).limit(10)
            elif any(k in clean_query for k in ["price", "cost", "catalog", "rate", "stock", "available", "product"]):
                stmt = select(Product).limit(8)
            else:
                return []

            db_res = await session.execute(stmt)
            products = db_res.scalars().all()

            for p in products:
                results.append({
                    "item_code": p.item_code,
                    "item_name": p.name,
                    "category": p.category,
                    "size": p.available_sizes,
                    "base_price": f"₹{p.base_price:.2f}",
                    "tax": f"{p.tax_percentage}%",
                    "final_price_with_tax": f"₹{p.final_price:.2f}",
                    "in_stock": "In Stock" if p.is_in_stock else "Out of Stock (Available on order)",
                    "stock_quantity": p.stock_quantity,
                })
    except Exception as exc:
        logger.warning("Knowledge retrieval error: %s", exc)

    return results
