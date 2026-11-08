# Test Infrastructure Specification: E2E 4-Tier Test Suite

## 1. Overview & Strategy
This document establishes the End-to-End (E2E) testing infrastructure for the unified **Bedi Fashion™** full-stack application (`adventurous-raman` and `bedi_vedio` integration). The infrastructure validates all functional requirements (R1–R5), interface contracts, and architectural components defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

The testing strategy is organized into a strict **4-tier testing hierarchy**, guaranteeing progressive verification from isolated feature contracts to complex cross-boundary integration and full real-world customer journeys.

---

## 2. Directory Layout & Architecture

The E2E test suite resides exclusively in `tests_e2e/` at the repository root:

```
tests_e2e/
├── __init__.py
├── conftest.py                       # Global fixtures, TestClient, mocks, environment setup
├── test_tier1_feature_coverage.py     # Tier 1: Core Feature Contract Coverage (>=5 per feature)
├── test_tier2_boundary_corner.py     # Tier 2: Boundary, Adversarial & Error Handling (>=5 per category)
├── test_tier3_cross_feature.py       # Tier 3: Cross-Feature Pairwise Combinations (>=3 per pair)
└── test_tier4_real_world_scenarios.py # Tier 4: Full Multi-Step User Journeys & Lifecycle
```

### Architectural Principles:
1. **Self-Contained & Order-Independent**: Each test sets up its own state and executes deterministically without relying on prior test side effects.
2. **Dual-Mode Verification**:
   - Fast, in-memory execution via FastAPI `TestClient` and simulated network/storage layers.
   - Live integration testing against the live Supabase project `ovdvycumqsjgvlsickjy` and running server endpoints.
3. **Zero Production Mutation**: Tests write to mock structures or dedicated test records and never alter production code or baseline assets.
4. **Authoritative Oracles**: Every expectation is directly derived from `PROJECT.md` interface contracts and `ORIGINAL_REQUEST.md` specifications.

---

## 3. 4-Tier Test Hierarchy & Coverage Matrix

### Tier 1: Feature Coverage (>=5 Tests per Feature)
Validates the fundamental contract and happy-path execution of each core system component:

| Feature # | Feature Name | Description | Minimum Tests | Implemented |
|---|---|---|:---:|:---:|
| F1 | Webhook GET Challenge Handshake | Meta WhatsApp webhook verification (`hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` echo) | 5 | 5 |
| F2 | Webhook POST Payload Ingestion | Ingestion of incoming text, interactive lists, button replies, quick buttons, and status receipt skipping | 5 | 6 |
| F3 | Frontend Static & 3D Delivery | Delivery of HTML UI, CSS luxury themes, client JS modules, and 3D binary models (`.glb` magic bytes) | 5 | 6 |
| F4 | Supabase Connectivity & Operations | Connection strictly targeting project `ovdvycumqsjgvlsickjy`, product catalog queries, and RFQ persistence | 5 | 6 |
| F5 | Backend Health & CORS | `GET /health` endpoint, CORS preflight `OPTIONS`, WhatsApp redirect (`/chat`, `/`), and privacy policy | 5 | 6 |
| F6 | Runner Orchestration | `start.py` process command assembly, Supabase pre-check guard, tunnel URL extraction, and clean shutdown | 5 | 6 |
| **Tier 1 Total** | | | **30** | **35** |

---

### Tier 2: Boundary & Corner Cases (>=5 Tests per Category)
Validates system resilience against hostile, truncated, oversized, or unexpected inputs:

| Category # | Category Name | Description | Minimum Tests | Implemented |
|---|---|---|:---:|:---:|
| B1 | Invalid Tokens & Authentication | Rejection of unauthorized verification tokens, empty tokens, invalid HMAC-SHA256 signatures, and tampered payloads | 5 | 6 |
| B2 | Malformed Payloads & Corrupted Data | Handling of non-JSON bodies, truncated bytes, malformed UTF-8, missing `entry` arrays, and unsupported message types | 5 | 6 |
| B3 | Non-Existent Endpoints & Traversal | 404 responses for invalid API routes, blocking directory traversal (`/../package.json`, `/%2e%2e/`), and missing assets | 5 | 5 |
| B4 | Empty Inputs & Extreme Boundaries | 400 Bad Request on missing webhook parameters, empty message bodies, default fallback for missing RFQ fields, and large payloads (>100KB) | 5 | 6 |
| B5 | Network Timeouts & Latency | Graceful handling of network timeouts during Supabase queries, Cloudflare tunnel polling limits, and LLM latency | 5 | 5 |
| B6 | Duplicate Requests & Idempotency | Idempotent GET verification, duplicate webhook message receipts (`wamid`), repeated status receipts, and unique RFQ ID generation | 5 | 5 |
| **Tier 2 Total** | | | **30** | **33** |

---

### Tier 3: Cross-Feature Combinations (Pairwise Integration)
Validates interactions across system boundaries and architectural layers:

| Pair # | Interaction Pair | Scope & Interface Contract | Minimum Tests | Implemented |
|---|---|---|:---:|:---:|
| P1 | Frontend (`:3000`) ↔ Backend (`:8000`) CORS | Cross-origin requests from frontend client to backend endpoints, preflight OPTIONS handling, and reverse proxying | 3 | 4 |
| P2 | Webhook Ingestion ↔ Supabase Database | Incoming WhatsApp customer messages triggering inquiry and cart persistence in Supabase `b2b_inquiries` / `messages` | 3 | 4 |
| P3 | Cloudflare Tunnel ↔ Webhook Handshake | Quick tunnel URL extraction, forwarding Meta verification GET and POST events through the public tunnel URL to backend | 3 | 4 |
| P4 | Runner Orchestration ↔ Child Process Lifecycle | Single runner (`start.py`) launching FastAPI and Node servers concurrently, monitoring ports, and executing graceful SIGTERM/SIGINT teardown | 3 | 4 |
| **Tier 3 Total** | | | **12** | **16** |

---

### Tier 4: Real-World Scenarios (End-to-End User Journeys)
Validates complete multi-step business workflows mimicking real customer and administrator behavior:

| Journey # | Journey Name | Workflow Stages | Minimum Tests | Implemented |
|---|---|---|:---:|:---:|
| J1 | WhatsApp Customer Inquiry & Lead Qualification | Customer greeting -> interactive menu choice -> institutional inquiry -> fabric specification presentation -> quotation handoff to Mr. Bedi (+91 9211825699) | 2 | 3 |
| J2 | Institutional RFQ Submission & Persistence | Institutional purchaser visits web UI -> fills RFQ form (school/hospital, contact, quantity) -> submits `POST /api/inquiries` -> saved to Supabase `b2b_inquiries` -> queryable | 2 | 3 |
| J3 | Full-Stack Cold Boot to Graceful Teardown | Cold boot invocation of runner -> pre-flight Supabase check -> backend & frontend port readiness polling -> webhook verification -> clean SIGTERM teardown | 2 | 3 |
| **Tier 4 Total** | | | **6** | **9** |

---

### Overall Suite Summary:
- **Total Minimum Required**: 78 tests
- **Total Implemented Tests**: 93 tests
- **Target Pass Rate**: 100%

---

## 4. Execution & Verification Commands

### Full E2E Test Suite Run:
```bash
pytest tests_e2e -v
```
or via the Python module:
```bash
python -m pytest tests_e2e -v
```

### Running Individual Tiers:
```bash
# Tier 1: Feature Coverage
pytest tests_e2e/test_tier1_feature_coverage.py -v

# Tier 2: Boundary & Corner Cases
pytest tests_e2e/test_tier2_boundary_corner.py -v

# Tier 3: Cross-Feature Combinations
pytest tests_e2e/test_tier3_cross_feature.py -v

# Tier 4: Real-World Scenarios
pytest tests_e2e/test_tier4_real_world_scenarios.py -v
```

### Environment Requirements:
The test suite utilizes the workspace virtual environment and requires:
- `pytest >= 7.4.0`
- `httpx >= 0.25.0`
- `fastapi >= 0.104.0`
- `python-dotenv >= 1.0.0`
- Active `.env` file with `SUPABASE_PROJECT_REF=ovdvycumqsjgvlsickjy` and valid credentials.
