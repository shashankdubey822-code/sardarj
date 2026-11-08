import asyncio
from app.config import get_settings
from app.services.whatsapp import WhatsAppService

async def main():
    settings = get_settings()
    wa = WhatsAppService(settings)
    sections = [
        {
            "title": "Uniform Categories",
            "rows": [
                {"id": "cat_tshirts", "title": "👕 T-Shirts", "description": "Sizes 26 to 42 - from ₹273"},
                {"id": "cat_pants", "title": "👖 School Pants", "description": "Blue and White Belt Pants"},
                {"id": "cat_coats", "title": "🧥 Coats and Blazers", "description": "Sizes 26 to 42 - from ₹1050"},
                {"id": "cat_shoes", "title": "👞 School Shoes", "description": "Black and White - from ₹399"},
                {"id": "cat_tunics", "title": "👗 Girls Tunics", "description": "Tailored uniform tunics"},
                {"id": "cat_bottoms", "title": "🩳 Dividers and Shorts", "description": "Cycling shorts and dividers"},
                {"id": "cat_accessories", "title": "👔 Belts and Ties", "description": "Official school belts and ties"},
                {"id": "cat_table", "title": "🪑 Study Tables", "description": "Study and hostel tables"},
                {"id": "b2b_inquiry", "title": "🏭 Bulk / B2B Order", "description": "Bulk uniform manufacturing"},
                {"id": "view_cart", "title": "🛒 View Cart", "description": "Review your selected items"}
            ]
        }
    ]
    res = await wa.send_interactive_list(
        to_number="919205382254",
        body_text="Welcome to Bedi Fashion! ✨\n\nPlease select a category from the menu below to explore our products:",
        button_label="Browse Catalog",
        sections=sections,
        header_text="Bedi Fashion Store",
        footer_text="Select an option to view items"
    )
    print("Delivered status:", res)

if __name__ == "__main__":
    asyncio.run(main())
