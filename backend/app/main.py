"""Application factory and main entry point for WhatsApp Cloud API Bot."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api.webhook import router as webhook_router
from app.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.db.session import init_db

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycle events.

    Args:
        app: The FastAPI application instance.

    Yields:
        None: When application is active and ready to handle requests.
    """
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info("Initializing database...")
    try:
        await init_db()
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.error("Database initialization failed: %s", exc)

    logger.info("WhatsApp Cloud API bot initialized with model: %s", settings.gemini_model)
    try:
        yield
    finally:
        logger.info("Application shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance.

    Returns:
        FastAPI: Fully configured application instance.
    """
    app = FastAPI(
        title="WhatsApp Cloud API Chatbot",
        description="Production-grade asynchronous WhatsApp Cloud API AI bot.",
        version="2.0.0",
        lifespan=lifespan,
    )

    # Configure CORS for frontend web client integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(webhook_router)

    # Health check endpoints
    @app.get("/health", tags=["health"])
    async def health_check() -> Dict[str, str]:
        """Health check endpoint to verify service operational status.

        Returns:
            Dict[str, str]: Service status indicators.
        """
        return {
            "status": "online",
            "service": "WhatsApp Cloud API Chatbot",
            "version": "2.0.0",
        }

    # Direct Redirection to WhatsApp Chat
    @app.get("/chat", response_class=HTMLResponse, tags=["chat"])
    @app.get("/", response_class=HTMLResponse, tags=["chat"])
    async def redirect_to_whatsapp(phone: str = "919211825699") -> HTMLResponse:
        """Directly open WhatsApp to chat with your official bot.

        Args:
            phone: Target WhatsApp phone number in international format (no + or spaces).
        """
        clean_phone = "".join(filter(str.isdigit, phone))
        whatsapp_url = f"https://wa.me/{clean_phone}"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirecting to Bedi Fashion WhatsApp...</title>
            <meta http-equiv="refresh" content="2;url={whatsapp_url}">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #f0f2f5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: white;
                    padding: 36px 32px;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    text-align: center;
                    max-width: 440px;
                    width: 90%;
                }}
                h1 {{ font-size: 22px; color: #111b21; margin-bottom: 8px; }}
                p {{ color: #667781; font-size: 15px; margin-bottom: 24px; line-height: 1.5; }}
                .btn {{
                    display: inline-block;
                    background-color: #25D366;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    padding: 14px 28px;
                    border-radius: 30px;
                    text-decoration: none;
                    box-shadow: 0 2px 8px rgba(37,211,102,0.4);
                    transition: all 0.2s;
                }}
                .btn:hover {{ background-color: #20ba59; transform: translateY(-1px); }}
                .footer {{ margin-top: 24px; font-size: 13px; color: #8696a0; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>💬 Chat with Bedi Fashion</h1>
                <p>Opening WhatsApp to connect directly with your automated assistant...</p>
                <a href="{whatsapp_url}" class="btn">👉 Click Here to Open WhatsApp</a>
                <div class="footer">If WhatsApp does not open automatically in 2 seconds, click the button above.</div>
            </div>
            <script>
                // Auto redirect immediately
                setTimeout(function() {{
                    window.location.href = "{whatsapp_url}";
                }}, 600);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

    # Public Privacy Policy endpoint for Meta App Review & Publishing
    @app.get("/privacy", response_class=HTMLResponse, tags=["compliance"])
    async def privacy_policy() -> HTMLResponse:
        """Public privacy policy page required for Meta app publishing."""
        html_content = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Privacy Policy - Bedi Fashion</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
                h1 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                h2 { color: #2c3e50; margin-top: 24px; }
            </style>
        </head>
        <body>
            <h1>Privacy Policy for Bedi Fashion</h1>
            <p><strong>Effective Date:</strong> November 2026</p>
            <p>Bedi Fashion operates a customer service and commerce assistant on WhatsApp. This policy explains how we collect, use, and protect your information.</p>
            
            <h2>1. Information We Collect</h2>
            <p>When you interact with our WhatsApp assistant, we collect:</p>
            <ul>
                <li>Your phone number and WhatsApp profile name.</li>
                <li>Messages, inquiries, product preferences, and cart details you send us.</li>
            </ul>

            <h2>2. How We Use Information</h2>
            <p>We use this information exclusively to:</p>
            <ul>
                <li>Answer customer inquiries regarding clothing items, sizes, and pricing.</li>
                <li>Process wholesale and manufacturing intake requests.</li>
                <li>Provide customer support.</li>
            </ul>

            <h2>3. Data Protection & Sharing</h2>
            <p>We never sell, trade, or distribute your personal contact information to third parties. Data is stored securely to maintain your conversation context.</p>

            <h2>4. Data Deletion Instructions</h2>
            <p>Users can request the complete deletion of their interaction history and data at any time by messaging <strong>DELETE MY DATA</strong> or <strong>STOP</strong> directly in the WhatsApp chat, or by emailing us at <strong>bedi125guru@gmail.com</strong>.</p>

            <h2>5. Contact Us</h2>
            <p>If you have any questions, contact us at: <strong>bedi125guru@gmail.com</strong>.</p>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

    return app


app = create_app()
