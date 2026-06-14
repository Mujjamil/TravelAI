# 🤖 Travel Planner AI v2 — Tech Stack & AI Architecture

This document provides an in-depth look at the technological design, implementation details, and AI/ML architecture powering the **Travel Planner AI v2** application.

---

## 🎯 What the Project is Made For & Why It's Useful

**Travel Planner AI v2** is a next-generation travel planning assistant that bridges the gap between conversational AI and real-time travel logistics. 

### Why is it useful?
* **Zero-friction onboarding**: Instead of filling out exhausting, multi-step search forms, users simply chat naturally (e.g., *"I want to plan a 5-day adventure trip to Bali next month"*).
* **Multi-Turn Slot Filling**: The backend actively tracks user conversation state. If essential details are missing (like trip duration, budget, or companion type), it guides the user with context-aware, localized prompts.
* **Real-time API Integration**: Integrates directly with Amadeus and Aviationstack APIs to pull live hotel grids and flight options, rather than generating hallucinated, outdated list data.
* **Interactive Mapping**: Uses OpenStreetMap (Leaflet) and Open Source Routing Machine (OSRM) to automatically calculate real driving routes between nearby cities or render geodesic flight arcs for long-distance international travel.
* **Image Landmark Recognition**: Users can upload a photo of a landmark, and the app will recognize the place and immediately prompt actions to plan a trip there.

---

## 💻 The Tech Stack

The application runs a decoupled multi-service architecture designed for speed, flexibility, and cost-efficiency.

```
       ┌────────────────────────┐
       │   React SPA Frontend   │ (Vite, Leaflet, Tailwind CSS)
       └───────────┬────────────┘
                   │ HTTP / API Requests
                   ▼
       ┌────────────────────────┐
       │   Node.js API Server   │ (Express, SQLite, Services)
       └─────┬────────────┬─────┘
             │            │
  Call Local │            │ Cloud API Requests
  Flask NLP  ▼            ▼
   ┌───────────┐    ┌───────────┐
   │ Python ML │    │ Cloud LLM │ (Groq, Google Gemini, 
   │  Server   │    │ Providers │  Kimi, Claude, Grok)
   └───────────┘    └───────────┘
```

### 1. Frontend
* **Core Framework**: React (v18) built with **Vite** for lightning-fast hot-reloading and compilation.
* **Styling**: Tailwind CSS for responsive, utility-first UI components.
* **State Management**: **Zustand** for ultra-lightweight, reactive global state.
* **Localization**: **i18next** & **react-i18next** supporting localization (English, French, Hindi, Marathi, Kannada).
* **Interactive Maps**: **Leaflet** and **React-Leaflet** for plotting interactive route maps, hotel markers, and flight paths.

### 2. Node.js Backend Server
* **Framework**: Express.js.
* **Database**: **SQLite3** (via `better-sqlite3`) for storing user profiles, chat history, and saved trip records locally without external database management overhead.
* **Orchestration**: Manages external API clients, sessions, and calls the Python NLP service.

### 3. Local Machine Learning & NLP Server
* **Framework**: Flask (Python 3) running on port `5001`.
* **Libraries**: Scikit-Learn, NumPy, Pandas, Joblib.
* **Role**: Runs local intent classification and entity extraction to parse user inputs offline before querying LLMs.

---

## 🧠 The AI Architecture & Implementation

The project utilizes a **hybrid AI design** combining **local classical machine learning** with **large language models (LLMs)**.

### 1. Local NLP Pipeline (Classifier & Extractor)
To avoid high API costs and latency, the system performs first-pass intent and parameter extraction locally.

* **Intent Classifier**: 
  * Built using a **TF-IDF Vectorizer** (capturing word n-grams from 1 to 3 words) paired with a **Linear Support Vector Machine (LinearSVC)**.
  * Uses **CalibratedClassifierCV** with Platt Scaling (sigmoid calibration) to compute precise confidence probabilities (0.0 - 1.0) for each intent.
  * Classes include: `trip.plan`, `flight.search`, `hotel.search`, `budget.estimate`, `itinerary.generate`, `packing.assist`, `weather.check`, and `destination.recommend`.
* **Entity Extractor**:
  * Utilizes rule-based Regex matching and keyword dictionary lookup to isolate travel-specific entities: `destination`, `origin`, `trip-duration`, `budget-range`, `travel-month`, `companion`, and `place-type`.
* **Multi-Turn Slot Filling**:
  * If the classifier flags the `trip.plan` intent, the local server checks if all required slots (e.g., duration, budget, companion) are present.
  * If any slot is missing, it responds with a slot prompt question and preserves the context in an in-memory session.

---

### 2. Cloud LLM Providers
For complex tasks (fallback responses, unstructured conversations, place/image analysis), the backend dynamically interfaces with cloud LLM APIs:

| Provider | Purpose | Default Models |
| :--- | :--- | :--- |
| **Groq** | Primary text generation, intent fallbacks, and vision tasks | `llama-3.3-70b-versatile` (text)<br>`llama-3.2-90b-vision-preview` (vision) |
| **Google Gemini** | Multimodal place recognition and fallback text generation | `gemini-1.5-flash` (vision)<br>`gemini-2.0-flash` (text) |
| **Kimi / NVIDIA** | Alternative place recognition & chatbot integration | NVIDIA NIM endpoints |
| **Anthropic / xAI** | Pluggable backup support | Claude, Grok APIs |

---

### 3. How AI is Implemented (Code Flow)

#### A. Chat Message Process Flow
1. **User inputs message** in the chat box.
2. **Node.js server** sends the message to the Python Flask NLP server (`POST /predict`).
3. **Flask NLP Server** evaluates the input:
   * Classifies the intent.
   * Extracts entities.
   * If required entities are missing (e.g., destination is set, but duration is not), it returns the next slot prompt.
4. **Node.js router** checks the result:
   * **Case A: Missing Slots**: Send prompt back to user.
   * **Case B: Confident Intent & Complete Slots**: Call the local response engine to assemble live API results (e.g., query flights/hotels) and generate formatted markdown.
   * **Case C: Low Confidence / Off-Topic**: Handoff the request to **Groq** or **Gemini**. The LLM is forced via system prompt to output structured JSON and keep comments strictly travel-focused.

#### B. Image & Landmark Recognition Flow
1. The user uploads a photo via the chat interface (`POST /api/chat/recognize-place`).
2. Node.js processes the upload with `multer` in-memory.
3. The server checks the `AI_VISION_PROVIDER` env variable:
   ```javascript
   // backend/services/placeRecognitionService.js
   const provider = (process.env.AI_VISION_PROVIDER || 'groq').toLowerCase();
   ```
4. If **Gemini** is selected, the buffer is converted to base64 and sent to Gemini:
   ```javascript
   // backend/services/geminiService.js
   const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
   const result = await model.generateContent({
     contents: [{
       role: 'user',
       parts: [
         { text: 'Identify this place from the photo. Return JSON only.' },
         { inlineData: { mimeType, data: imageBuffer.toString('base64') } }
       ]
     }]
   });
   ```
5. The model returns a structured JSON payload defining the location (city, country, landmark type) and confidence percentage.
6. The UI parses the response, pins the location, and shows quick-action buttons (e.g. "Plan a trip to this place").
