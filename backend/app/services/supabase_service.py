"""Bedi Fashion — Supabase Production Service Integration.

Handles direct database operations against Supabase Project ovdvycumqsjgvlsickjy
using official REST API and service credentials.
"""

import os
from typing import Any, Dict, List, Optional
import httpx
from dotenv import load_dotenv
from app.config import get_settings
from app.core.logging import get_logger

# Load environment
load_dotenv()

logger = get_logger(__name__)


class SupabaseService:
    """Production client for Supabase project ovdvycumqsjgvlsickjy."""

    def __init__(self) -> None:
        load_dotenv()
        settings = get_settings()
        self.url = settings.supabase_url or os.getenv("SUPABASE_URL", "https://ovdvycumqsjgvlsickjy.supabase.co")
        self.project_ref = settings.supabase_project_ref or os.getenv("SUPABASE_PROJECT_REF", "ovdvycumqsjgvlsickjy")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or getattr(settings, "supabase_service_role_key", "")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    async def check_health(self) -> Dict[str, Any]:
        """Verify Supabase connectivity and retrieve table statistics."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.url}/rest/v1/products?select=count",
                    headers=self.headers
                )
                if resp.status_code == 200:
                    counts = resp.json()
                    total = counts[0].get("count", 0) if counts else 0
                    return {
                        "status": "connected",
                        "project_ref": self.project_ref,
                        "products_count": total
                    }
                return {"status": "degraded", "code": resp.status_code, "error": resp.text}
        except Exception as exc:
            logger.error("Supabase health check failed: %s", exc)
            return {"status": "error", "error": str(exc)}

    async def get_products(self, category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch products from Supabase."""
        try:
            query = f"{self.url}/rest/v1/products?select=*&limit={limit}"
            if category:
                query += f"&category=ilike.*{category}*"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(query, headers=self.headers)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning("Failed to fetch products: %s %s", resp.status_code, resp.text)
                return []
        except Exception as exc:
            logger.error("Error fetching Supabase products: %s", exc)
            return []

    async def save_b2b_inquiry(self, inquiry_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Save an RFQ / institutional inquiry to Supabase b2b_inquiries table."""
        try:
            payload = {
                "organization_name": inquiry_data.get("organization_name") or inquiry_data.get("org_name", "Anonymous Org"),
                "contact_person": inquiry_data.get("contact_person") or inquiry_data.get("name", "Unknown Contact"),
                "phone": inquiry_data.get("phone", ""),
                "email": inquiry_data.get("email", ""),
                "sector": inquiry_data.get("sector") or inquiry_data.get("category", "General"),
                "estimated_quantity": int(inquiry_data.get("quantity") or inquiry_data.get("estimated_quantity") or 100),
                "requirements": inquiry_data.get("requirements") or inquiry_data.get("notes") or "Direct portal RFQ",
                "status": "pending"
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.url}/rest/v1/b2b_inquiries",
                    headers=self.headers,
                    json=payload
                )
                if resp.status_code in (200, 201):
                    res = resp.json()
                    return res[0] if isinstance(res, list) and res else res
                logger.error("Supabase inquiry save failed: %s %s", resp.status_code, resp.text)
                return None
        except Exception as exc:
            logger.error("Exception saving Supabase inquiry: %s", exc)
            return None


_supabase_service_instance = None


def get_supabase_service() -> SupabaseService:
    """Retrieve singleton SupabaseService instance."""
    global _supabase_service_instance
    if _supabase_service_instance is None:
        _supabase_service_instance = SupabaseService()
    return _supabase_service_instance
