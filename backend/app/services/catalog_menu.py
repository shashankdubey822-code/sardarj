"""Interactive WhatsApp List Menus and Catalog Navigation for Bedi Fashion."""

from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, select

from app.core.logging import get_logger
from app.db.models import B2BInquiry, CartItem, Product
from app.db.session import get_session_factory

logger = get_logger(__name__)

# Category mapping from menu key to display and database patterns
CATEGORY_MAP: Dict[str, Dict[str, Any]] = {
    "cat_tshirts": {
        "title": "👕 T-Shirts",
        "description": "Sizes 26 to 42 - from ₹273",
        "db_category": "T-shirt",
        "header": "Bedi Fashion T-Shirts",
        "body": "Cotton uniform & casual T-Shirts (5% GST included).\nSelect a size from the drop-down menu below:",
        "button": "Select T-Shirt",
    },
    "cat_pants": {
        "title": "👖 School Pants",
        "description": "Blue & White Belt Pants",
        "db_category": "Belt_pant",
        "header": "Bedi Fashion Pants",
        "body": "Tailored Blue & White school belt pants (5% GST included).\nSelect a size from the menu below:",
        "button": "Select Pants",
    },
    "cat_coats": {
        "title": "🧥 Coats & Blazers",
        "description": "Sizes 26 to 42 - from ₹1,050",
        "db_category": "Coat",
        "header": "Bedi Fashion Coats",
        "body": "Winter school blazers & coats (5% GST included).\nSelect a size from the menu below:",
        "button": "Select Coat",
    },
    "cat_shoes": {
        "title": "👞 School Shoes",
        "description": "Black & White shoes - from ₹399",
        "db_category": "Shoes",
        "header": "Bedi Fashion Shoes",
        "body": "Durable Black & White uniform shoes (5% GST included).\nSelect your shoe size below:",
        "button": "Select Shoes",
    },
    "cat_tunics": {
        "title": "👗 Girls Tunics",
        "description": "Tailored uniform tunics",
        "db_category": "Tunics",
        "header": "Bedi Fashion Tunics",
        "body": "Tailored girls' school uniform tunics (5% GST included).\nSelect a size below:",
        "button": "Select Tunic",
    },
    "cat_bottoms": {
        "title": "🩳 Dividers & Shorts",
        "description": "Cycling shorts & dividers",
        "db_category": ["Devider", "Cycling_shorts"],
        "header": "Dividers & Shorts",
        "body": "School dividers & comfortable cycling shorts (5% GST included).\nSelect an option below:",
        "button": "Select Item",
    },
    "cat_accessories": {
        "title": "👔 Belts & Ties",
        "description": "School belts & formal ties",
        "db_category": ["Belt", "Tie"],
        "header": "School Belts & Ties",
        "body": "Official school belts and ties (5% GST included).\nSelect an item below:",
        "button": "Select Belt/Tie",
    },
    "cat_table": {
        "title": "🪑 Study Tables",
        "description": "Hostel & study furniture",
        "db_category": "Table",
        "header": "Study Furniture",
        "body": "High-durability hostel & study tables (5% GST included).\nSelect below:",
        "button": "Select Table",
    },
}

# Aliases for robust interactive resolution
CATEGORY_MAP["cat_belt"] = CATEGORY_MAP["cat_accessories"]
CATEGORY_MAP["cat_belts"] = CATEGORY_MAP["cat_accessories"]
CATEGORY_MAP["cat_tshirt"] = CATEGORY_MAP["cat_tshirts"]
CATEGORY_MAP["cat_pant"] = CATEGORY_MAP["cat_pants"]
CATEGORY_MAP["cat_coat"] = CATEGORY_MAP["cat_coats"]
CATEGORY_MAP["cat_shoe"] = CATEGORY_MAP["cat_shoes"]
CATEGORY_MAP["cat_tunic"] = CATEGORY_MAP["cat_tunics"]


def sanitize_row(title: str, description: Optional[str] = None) -> Dict[str, str]:
    """Ensure Meta character constraints: title <= 24 chars, desc <= 72 chars."""
    clean_title = title.strip()[:24]
    row: Dict[str, str] = {"title": clean_title}
    if description:
        row["description"] = description.strip()[:72]
    return row


class CatalogMenuService:
    """Service generating WhatsApp Interactive List Menus and cart interactions."""

    @staticmethod
    def get_main_menu() -> Dict[str, Any]:
        """Generate top-level category drop-down list menu."""
        rows = [
            {"id": "cat_tshirts", **sanitize_row("👕 T-Shirts", "Sizes 26 to 42 - from ₹273")},
            {"id": "cat_pants", **sanitize_row("👖 School Pants", "Blue & White Belt Pants")},
            {"id": "cat_coats", **sanitize_row("🧥 Coats & Blazers", "Sizes 26 to 42 - from ₹1,050")},
            {"id": "cat_shoes", **sanitize_row("👞 School Shoes", "Black & White shoes - from ₹399")},
            {"id": "cat_tunics", **sanitize_row("👗 Girls Tunics", "Tailored uniform tunics")},
            {"id": "cat_bottoms", **sanitize_row("🩳 Dividers & Shorts", "Cycling shorts & dividers")},
            {"id": "cat_accessories", **sanitize_row("👔 Belts & Ties", "School belts & formal ties")},
            {"id": "cat_table", **sanitize_row("🪑 Study Tables", "Hostel & study tables")},
            {"id": "b2b_inquiry", **sanitize_row("🏭 Bulk / B2B Order", "School uniform manufacturing")},
            {"id": "view_cart", **sanitize_row("🛒 View Cart", "Review selected items & checkout")},
        ]
        return {
            "header_text": "Bedi Fashion Store",
            "body_text": (
                "Hello ji! Bedi Fashion mein aapka swagat hai! ✨\n\n"
                "Aapko typing karne ki zaroorat nahi hai—kripya neeche button par "
                "tap karke category select karein:"
            ),
            "button_label": "Browse Catalog",
            "sections": [
                {
                    "title": "Store Categories",
                    "rows": rows[:10],
                }
            ],
            "footer_text": "Tap button to select",
        }

    @staticmethod
    async def get_category_menu(cat_key: str) -> Optional[Dict[str, Any]]:
        """Generate sub-menu listing products under a selected category."""
        config = CATEGORY_MAP.get(cat_key)
        if not config:
            return None

        db_cat = config["db_category"]
        factory = get_session_factory()

        async with factory() as session:
            if isinstance(db_cat, list):
                stmt = select(Product).where(Product.category.in_(db_cat)).order_by(Product.id.asc()).limit(9)
            else:
                stmt = select(Product).where(Product.category == db_cat).order_by(Product.id.asc()).limit(9)

            result = await session.execute(stmt)
            products = list(result.scalars().all())

        rows = []
        for p in products:
            price_str = f"₹{p.final_price:.2f}"
            stock_str = f"Stock: {p.stock_quantity}" if p.is_in_stock else "Out of Stock"
            desc = f"{price_str} | {stock_str}"
            rows.append({
                "id": f"p_{p.id}",
                **sanitize_row(f"{p.name}", desc),
            })

        # Add return to main menu option as final row (must stay <= 10 rows total)
        rows.append({
            "id": "menu_main",
            **sanitize_row("🔙 Main Menu", "Return to all categories"),
        })

        return {
            "header_text": config["header"][:60],
            "body_text": config["body"][:1024],
            "button_label": config["button"][:20],
            "sections": [
                {
                    "title": config["title"][:24],
                    "rows": rows[:10],
                }
            ],
            "footer_text": "Tap button to select",
        }

    @staticmethod
    async def get_product_detail_menu(product_id: int) -> Optional[Dict[str, Any]]:
        """Generate interactive menu for a specific product."""
        factory = get_session_factory()
        async with factory() as session:
            stmt = select(Product).where(Product.id == product_id)
            result = await session.execute(stmt)
            product = result.scalar_one_or_none()

        if not product:
            return None

        stock_text = f"In Stock ({product.stock_quantity} available)" if product.is_in_stock else "Out of Stock"
        body_text = (
            f"✨ *{product.name}*\n"
            f"💰 Price: *₹{product.final_price:.2f}* (5% GST included)\n"
            f"📏 Size: {product.available_sizes} | Color: {product.color}\n"
            f"📦 Stock: {stock_text}\n"
            f"📝 {product.description}\n\n"
            f"Select an option below:"
        )

        rows = [
            {"id": f"add_cart_{product.id}", **sanitize_row("🛒 Add to Cart", f"Add 1x {product.name}")},
            {"id": "view_cart", **sanitize_row("🛍️ View Cart", "Check items in cart")},
            {"id": "menu_main", **sanitize_row("🔙 Main Menu", "Browse other categories")},
        ]

        return {
            "header_text": f"Bedi Fashion Item",
            "body_text": body_text[:1024],
            "button_label": "Product Options",
            "sections": [
                {
                    "title": "Select Action",
                    "rows": rows,
                }
            ],
            "footer_text": "Tap button to select",
        }

    @staticmethod
    async def add_to_cart(sender_id: str, product_id: int) -> Optional[Dict[str, Any]]:
        """Add product to user cart and return updated cart status menu."""
        factory = get_session_factory()
        async with factory() as session:
            stmt = select(Product).where(Product.id == product_id)
            res = await session.execute(stmt)
            product = res.scalar_one_or_none()

            if not product:
                return None

            cart_item = CartItem(
                sender_id=sender_id,
                product_name=product.name,
                size=product.available_sizes,
                color=product.color,
                quantity=1,
                price=product.final_price,
            )
            session.add(cart_item)
            await session.commit()

            # Calculate total
            total_stmt = select(func.count(CartItem.id), func.sum(CartItem.price)).where(
                CartItem.sender_id == sender_id
            )
            total_res = await session.execute(total_stmt)
            count, total_price = total_res.first() or (0, 0.0)
            total_price = total_price or 0.0

        body_text = (
            f"✅ *Added to Cart!* 🛒\n\n"
            f"Item: *{product.name}* (Size {product.available_sizes})\n"
            f"Price: ₹{product.final_price:.2f}\n\n"
            f"📦 Total Items: *{count}*\n"
            f"💰 Cart Total: *₹{total_price:.2f}* (incl. 5% tax)\n\n"
            f"Choose what you would like to do next:"
        )

        rows = [
            {"id": "view_cart", **sanitize_row("🛒 View Cart & Total", "Review all items in your cart")},
            {"id": "checkout", **sanitize_row("🛍️ Place Order Query", "Submit order to store team")},
            {"id": "menu_main", **sanitize_row("🔙 Continue Shopping", "Add more products")},
        ]

        return {
            "header_text": "Item Added to Cart",
            "body_text": body_text[:1024],
            "button_label": "Cart Options",
            "sections": [
                {
                    "title": "Next Steps",
                    "rows": rows,
                }
            ],
            "footer_text": "Tap button to select",
        }

    @staticmethod
    async def get_cart_menu(sender_id: str) -> Dict[str, Any]:
        """View user cart items and checkout options."""
        factory = get_session_factory()
        async with factory() as session:
            stmt = select(CartItem).where(CartItem.sender_id == sender_id).order_by(CartItem.id.asc())
            res = await session.execute(stmt)
            items = list(res.scalars().all())

        if not items:
            return {
                "header_text": "Your Shopping Cart",
                "body_text": (
                    "🛒 *Your cart is currently empty!*\n\n"
                    "Tap below to browse our school uniforms and products:"
                ),
                "button_label": "Start Shopping",
                "sections": [
                    {
                        "title": "Shopping",
                        "rows": [
                            {"id": "menu_main", **sanitize_row("🔙 Main Menu", "Browse all products")},
                        ],
                    }
                ],
                "footer_text": "Tap button to select",
            }

        total = sum(i.price * i.quantity for i in items)
        summary_lines = [f"• {i.product_name} (Size {i.size}) x{i.quantity} - ₹{i.price * i.quantity:.2f}" for i in items]
        body = (
            f"🛒 *Your Bedi Fashion Cart:*\n\n"
            + "\n".join(summary_lines)
            + f"\n\n💰 *Total: ₹{total:.2f}* (5% GST included)\n\n"
            f"Select an option below to proceed:"
        )

        rows = [
            {"id": "checkout", **sanitize_row("🛍️ Submit Order Query", "Send to store team to confirm")},
            {"id": "clear_cart", **sanitize_row("🗑️ Clear Cart", "Remove all items from cart")},
            {"id": "menu_main", **sanitize_row("🔙 Add More Items", "Browse other products")},
        ]

        return {
            "header_text": "Bedi Fashion Cart",
            "body_text": body[:1024],
            "button_label": "Cart Actions",
            "sections": [
                {
                    "title": "Cart Actions",
                    "rows": rows,
                }
            ],
            "footer_text": "Tap button to select",
        }

    @staticmethod
    async def clear_cart(sender_id: str) -> Dict[str, Any]:
        """Empty all cart items for user."""
        factory = get_session_factory()
        async with factory() as session:
            stmt = delete(CartItem).where(CartItem.sender_id == sender_id)
            await session.execute(stmt)
            await session.commit()

        return {
            "header_text": "Cart Cleared",
            "body_text": "🗑️ Your cart has been emptied.\n\nTap below to explore our products:",
            "button_label": "Browse Catalog",
            "sections": [
                {
                    "title": "Catalog",
                    "rows": [
                        {"id": "menu_main", **sanitize_row("🔙 Main Menu", "Browse all products")},
                    ],
                }
            ],
            "footer_text": "Tap button to select",
        }

    @staticmethod
    async def checkout_order(sender_id: str) -> Dict[str, Any]:
        """Submit cart as an order inquiry."""
        factory = get_session_factory()
        async with factory() as session:
            stmt = select(CartItem).where(CartItem.sender_id == sender_id)
            res = await session.execute(stmt)
            items = list(res.scalars().all())

            if not items:
                return CatalogMenuService.get_main_menu()

            total = sum(i.price * i.quantity for i in items)
            summary = ", ".join([f"{i.product_name} ({i.size}) x{i.quantity}" for i in items])

            inquiry = B2BInquiry(
                sender_id=sender_id,
                company_name="WhatsApp Retail Order",
                requirement=f"Cart Order: {summary} | Total: ₹{total:.2f}",
                estimated_quantity=len(items),
                status="pending_confirmation",
            )
            session.add(inquiry)

            # Clear cart after submitting
            del_stmt = delete(CartItem).where(CartItem.sender_id == sender_id)
            await session.execute(del_stmt)
            await session.commit()

        body = (
            f"🎉 *Thank You! Order Inquiry Received!*\n\n"
            f"Summary:\n{summary}\n\n"
            f"💰 Estimated Total: *₹{total:.2f}* (5% GST included)\n\n"
            f"Our Bedi Fashion store representative will message you shortly on this WhatsApp "
            f"number to confirm delivery address & payment.\n\n"
            f"Need urgent assistance? Call us directly: 📞 *+91 92118 25699*."
        )

        rows = [
            {"id": "menu_main", **sanitize_row("🔙 Main Menu", "Browse catalog")},
        ]

        return {
            "header_text": "Order Received",
            "body_text": body[:1024],
            "button_label": "Store Options",
            "sections": [
                {
                    "title": "Options",
                    "rows": rows,
                }
            ],
            "footer_text": "Bedi Fashion (+91 92118 25699)",
        }

    @staticmethod
    def get_b2b_inquiry_menu() -> Dict[str, Any]:
        """Generate bulk uniform manufacturing inquiry menu."""
        body = (
            "🏭 *Bedi Fashion - Bulk Uniform Manufacturing (B2B)*\n\n"
            "We supply and manufacture custom school, college, and corporate uniforms in bulk:\n"
            "• 100% Cotton & Oxford Fabrics\n"
            "• Custom School Logos & Embroidery\n"
            "• Direct Factory Wholesale Pricing\n\n"
            "Please reply with:\n"
            "1. School / Organization Name\n"
            "2. Required Items & Approximate Quantity\n"
            "3. Target Delivery Date\n\n"
            "Or call our wholesale desk: 📞 *+91 92118 25699*."
        )
        rows = [
            {"id": "menu_main", **sanitize_row("🔙 Main Menu", "Browse catalog")},
        ]
        return {
            "header_text": "Bulk Manufacturing (B2B)",
            "body_text": body[:1024],
            "button_label": "Main Menu",
            "sections": [
                {
                    "title": "Options",
                    "rows": rows,
                }
            ],
            "footer_text": "Bedi Fashion B2B",
        }
