import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import twilio from "twilio";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload capacity as maintenance bills can be sent as base64 images/documents
  app.use(express.json({ limit: "15mb" }));

  // Lazy-initialized Gemini client with safety check to prevent startup crashes when keys are missing
  let aiInstance: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required to prompt Gemini models.");
      }
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiInstance;
  }

  // Proxy object referencing the lazily loaded Gemini instance
  const ai = {
    get models() {
      return getAiClient().models;
    }
  };

  // Global in-memory location cache for active driving operators
  const activeDriverLocations: Record<string, { latitude: number; longitude: number; timestamp: string; driverName: string }> = {};

  // REST API: Automated Maintenance Bill OCR and Analysis via Gemini
  app.post("/api/maintenance/analyse-bill", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "No physical file data or mimeType received." });
      }

      const prompt = `You are a specialist fleet workshop and logistics auditor. Analyze this uploaded tanker maintenance or AdBlue cash/credit invoice or receipt.
Perform OCR and logic translation, then output a structured JSON matching this schema:
{
  "tankerNumber": "Vehicle registration or plate number if detectable, e.g. GJ-01-XX-1234 or empty string",
  "vendorName": "The service station, workshop, dealer, garage or supplier name",
  "billNo": "Invoice index, bill serial reference code, or sequential tag",
  "date": "Date of transaction represented strictly as YYYY-MM-DD. If missing, return the default date string '2026-05-25'",
  "amount": 8500,
  "category": "This must be either 'repair' (for mechanical repairs, spares, garage work) or 'adblue' (for urea / adblue refill supply bills)",
  "workType": "A single precise category string, e.g. 'Spare Part Changed', 'Tyre Work', 'Engine Service', 'AdBlue Refill', 'Electrical Issue'",
  "detail": "Descriptive logs detailing repairs, listed line items, quantities and mechanics notes",
  "gstType": "This must be either 'with_gst' (if the bill contains explicit GST details, GSTIN number, CGST/SGST line items, or tax details) or 'without_gst' (if a cash memo, simple receipt, or has no GST headings)"
}

Ensure you extract accurate billing data. If certain attributes are missing, formulate high-probability guesses or default entries. Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        analysis: analysisJson
      });
    } catch (error: any) {
      console.error("AI Analysis Core Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Auditing failure on engine service."
      });
    }
  });

  // REST API: Odometer Image OCR Reading Analysis via Gemini Vision
  app.post("/api/trips/analyse-odometer", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "No image file data or mimeType received." });
      }

      const prompt = `You are an AI fleet operations auditor. Analyze this photo of a petroleum cargo truck's physical dashboard odometer display dial or digital screen.
Extract the CURRENT odometer mileage or kilometer reading as a precise integer number. Do not invent numbers. 
If there are trip meters (often 3 or 4 digits) and overall odometers (usually 5 or 6 digits), prefer the overall odometer (total distance traveled).

Output a structured JSON response matching this schema:
{
  "reading": 125430,
  "confidence": "high or low",
  "notes": "Brief sensory notes if numbers are blurry or obscured"
}

Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI Odometer OCR Service Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Auditing failure on odometer reading extraction."
      });
    }
  });

  // REST API: Parse Scanned Lorry Receipt Image/PDF via Gemini
  app.post("/api/lr/parse-image", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "No image file data or mimeType received." });
      }

      const prompt = `You are a professional logistics auditor and expert transcriber. Analyze this scanned image or document photo of a complete Lorry Receipt (L.R.) or consignment note.
Perform deep OCR and logical field extraction, then output a structured JSON response matching this exact schema:
{
  "lrNo": "The receipt or L.R. number if found, e.g. LR-2026-1052. Format to matches business style.",
  "dated": "The date listed on the receipt in standard YYYY-MM-DD template. Format only as YYYY-MM-DD.",
  "consignerName": "The sender or consignor registered company name found on the receipt.",
  "consigneeName": "The receiver or consignor registered company name found on the receipt.",
  "product": "The name of the petroleum or chemical cargo product, e.g. Phenol, Liquid Urea, Methanol, Benzene, Chem Specialty",
  "qty": 24.5,
  "qtyUnit": "This must be either 'MT' (Metric Tonnes) or 'KL' (Kilolitres)",
  "placeFrom": "The origin city or loading location listed as place of origin.",
  "placeTo": "The delivery city or destination location listed as place of destination.",
  "tankerNumber": "The transport vehicle plate registration, tanker, or truck number, e.g. GJ-16-Z-1010.",
  "freightRate": 1250,
  "confidenceNotes": "Brief notes on text readability or confidence level"
}

Ensure you extract clean, real values. Put 0 or empty string for completely unreadable fields, but formulate your best educated guesses first. Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI L.R Parse Image Service Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Auditing failure on Lorry Receipt reading extraction."
      });
    }
  });

  // REST API: BPCL Fuel Statement spreadsheet / text parser
  app.post("/api/statements/analyse-bpcl", async (req, res) => {
    try {
      const { textData, sheetRows, statementText } = req.body;
      
      const payloadContext = sheetRows 
        ? JSON.stringify(sheetRows.slice(0, 150)) 
        : (textData || statementText);

      if (!payloadContext) {
        return res.status(400).json({ error: "No BPCL statement data or spreadsheet rows provided." });
      }

      const prompt = `You are a professional auditor for petrochemical fleet accounting. We have uploaded an official BPCL (Bharat Petroleum Corporation Limited) statement file.
Extract the individual tanker-wise refuel transactions. 
Identify columns like "Vehicle No", "Tanker Plate", "Date", "Transaction Date", "Quantity", "Volume/Ltrs", "Amount/Value Paid", "Retail Outlet/ROName/Pump".

Formulate a list of processed fuel slips to sync with our Ledger. For each row:
- Try to detect a valid Indian tanker plate number (e.g., GJ-16-Z-1010, MH-12-QB-4521, etc.).
- Extract the transaction date (format: YYYY-MM-DD).
- Extract volume (liters) and amount (Rs).
- Extract the petrol pump retail outlet name as vendorName.
- Try to detect timestamp or time (format: HH:MM or HH:MM:SS), default to "12:00" if not present.

Output a structured JSON matching:
{
  "refuels": [
    {
      "tankerNumber": "GJ-16-Z-1010",
      "date": "YYYY-MM-DD",
      "amount": 25000,
      "qtyLiters": 272,
      "vendorName": "BPCL RO - Baroda Highway Outlet",
      "billNo": "BPCL-TXN-12930",
      "place": "Detected city/place or RO location",
      "time": "12:00"
    }
  ],
  "slips": [
    {
      "tankerNumber": "GJ-16-Z-1010",
      "date": "YYYY-MM-DD",
      "amount": 25000,
      "qtyLiters": 272,
      "vendorName": "BPCL RO - Baroda Highway Outlet",
      "billNo": "BPCL-TXN-12930",
      "place": "Detected city/place or RO location",
      "time": "12:00"
    }
  ]
}

Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            text: prompt
          },
          {
            text: `BPCL Statement Content to parse: \n\n${payloadContext}`
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI BPCL Parser Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to parse BPCL statement."
      });
    }
  });

  // REST API: Live Location Tracking endpoints for drivers
  app.post("/api/drivers/update-location", (req, res) => {
    try {
      const { driverId, driverName, latitude, longitude } = req.body;
      if (!driverId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing driverId, latitude, or longitude values." });
      }

      activeDriverLocations[driverId] = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date().toISOString(),
        driverName: driverName || "Active Driver"
      };

      return res.json({ success: true, message: "Location updated successfully." });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/drivers/locations", (req, res) => {
    try {
      return res.json({ success: true, locations: activeDriverLocations });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // REST API: Automated Spreadsheet Trip Data File Analysis via Gemini
  app.post("/api/trips/analyse-spreadsheet", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const { sheetRows } = req.body;
      if (!sheetRows || !Array.isArray(sheetRows)) {
        return res.status(400).json({ error: "No valid spreadsheet row structure received." });
      }

      // Limit processed size to avoid token overflow
      const croppedRows = sheetRows.slice(0, 150);

      const prompt = `You are a professional logistics coordination AI auditor.
We have received uploaded spreadsheet data containing historical trip logs.
The spreadsheet content is parsed as a 2D JSON array of rows (where row 0 or 1 contains header labels like Date, LR No, Lorry plate, Party, Weight, Diesel, etc.):
${JSON.stringify(croppedRows)}

Analyze this layout and map the rows to our fleet management schema coordinates.
Perform deep semantic analyses:
- Map "Lorry No / Tanker Number / Truck No" to tankerNumber.
- Map "L.R. No / LR" to lrNo.
- Map "Consigner / Party" to consignerName.
- Map "Destination / Place To" to placeTo.
- Map "Source / Place From" to placeFrom.
- Map "Loading Wt / Qty" to loadingWeight (numeric).
- Map "Rate" to freightRateAtEnd (numeric).
- Map "Diesel / Fuel Cost / Fuel Expense" to fuelExpense (numeric).
- Map "Driver Pay / Salary" to driverCharge (numeric).
- Map "Toll Taxes" to tollExpense (numeric).
- Map "Repairs / Workshop" to repairExpense (numeric).
- Map "Adblue / Urea Cost" to adblueExpense (numeric).
- Map "Other / Misc Cost" to otherExpense (numeric).

Formulate clean unique IDs starting with: 'TRP-' for trips, 'LR-' for Lorry Receipts, 'TNK-' for tankers, 'DRV-' for drivers.
Make sure you synthesize equivalent objects so they are in sync:
- Every trip needs a unique lrId, tankerId, and driverId matching corresponding elements in lrs, tankers, and drivers lists.
- Set qtyUnit to either "KL" or "MT" based on any hints or default to "MT".
- Ensure loadingWeight is mapped as a number.
- Ensure status is "completed" for trip and "received" for lorry receipt.
- Set startDate and endDate using detected dates, or default to a reasonable sequence e.g., "2026-05-23" or "2026-05-24".
- Ensure profit is calculated as: (loadingWeight * freightRateAtEnd) - (fuelExpense + driverCharge + tollExpense + repairExpense + adblueExpense + otherExpense).

Output a structured JSON response corresponding exactly to this schema:
{
  "trips": [
    {
      "id": "TRP-001 or generated unique code",
      "lrNo": "extracted string",
      "lrId": "matching LR id in the lrs list",
      "tankerNumber": "e.g. MH-12-QB-4521",
      "tankerId": "matching tanker id in the tankers list",
      "driverName": "extracted driver name",
      "driverId": "matching driver id in the drivers list",
      "placeFrom": "extracted",
      "placeTo": "extracted",
      "qty": 25,
      "qtyUnit": "MT",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "status": "completed",
      "loadingWeight": 25,
      "unloadingWeight": 25,
      "approxDistanceKm": 400,
      "expectedFuelLiters": 120,
      "expectedAdblueLiters": 6,
      "fuelExpense": 22000,
      "driverCharge": 4500,
      "tollExpense": 1500,
      "repairExpense": 0,
      "adblueExpense": 800,
      "adblueAddedLiters": 10,
      "otherExpense": 500,
      "freightRateAtEnd": 1200,
      "revenue": 30000,
      "profit": 700
    }
  ],
  "lrs": [
    {
      "id": "matching LR- id",
      "lrNo": "same lrNo as above",
      "dated": "YYYY-MM-DD",
      "consignerName": "extracted company name or 'Industrial consigner'",
      "consigneeName": "extracted consignee or 'Chemical Consignee'",
      "tankerId": "matching tanker id",
      "tankerNumber": "same plate as above",
      "product": "extracted product name or 'Chemical fluids'",
      "qty": 25,
      "qtyUnit": "MT",
      "placeFrom": "extracted",
      "placeTo": "extracted",
      "freightRate": 1200,
      "freightTotal": 30000,
      "status": "received"
    }
  ],
  "tankers": [
    {
      "id": "matching tanker id",
      "tankerNumber": "same plate",
      "status": "idle"
    }
  ],
  "drivers": [
    {
      "id": "matching driver id",
      "name": "driver name",
      "contactNumber": "+91 99999 99999",
      "bankAccountNumber": "",
      "bankName": "",
      "ifscCode": "",
      "licenseNumber": "",
      "status": "active"
    }
  ]
}

Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI Spreadsheet Analysis Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Auditing failure on engine spreadsheet service."
      });
    }
  });

  // REST API: Automated Statement & Ledger Bill Analysis via Gemini
  app.post("/api/statements/analyse", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const { sheetRows } = req.body;
      if (!sheetRows || !Array.isArray(sheetRows)) {
        return res.status(400).json({ error: "No valid statement row structure received." });
      }

      const croppedRows = sheetRows.slice(0, 150);

      const prompt = `You are an expert logistics accountant auditing workshop repair bills, maintenance logs, and financial vendor statement files.
The spreadsheet content is parsed as a 2D JSON array of rows:
${JSON.stringify(croppedRows)}

Analyze these rows and compile or map them to our MaintenanceBill schema.
- Map "Date / Bill Date / Invoiced Date" to date (format YYYY-MM-DD). If not visible default to "2026-05-24".
- Map "Bill No / Invoice No / Reference No" to billNo.
- Map "Amount / Total Amount / Net Payable" to amount (numeric value).
- Map "Vendor Name / Creditor / Repair Shop" to vendorName.
- Map "Work Detail / Service / Repair/ Note" to detail.
- Map "Category / Type / Dept" to category (must be either "repair" or "adblue").
- Map "Lorry plate / Tanker No" to tankerNumber.
- Map "Work Type" to workType (e.g. "Spare Part Changed", "Wheel Alignment", "Diesel Refuel").

Formulate a clean unique ID starting with 'BIL-' for each bill. Keep status as "pending" or "collected" if paid.
Output a structured JSON response corresponding exactly to this schema:
{
  "bills": [
    {
      "id": "BIL-001 or generated unique code",
      "category": "repair",
      "tankerId": "TNK-mapped or blank as default",
      "tankerNumber": "extracted-plate-or-GJ-16-Z-1010",
      "billNo": "INV-10931",
      "date": "YYYY-MM-DD",
      "vendorName": "Balaji Tyres",
      "amount": 25000,
      "detail": "Purchase of radial truck tyres",
      "workType": "Spare Part Changed",
      "status": "pending"
    }
  ]
}

Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI Statement Analysis Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Auditing failure on engine statement service."
      });
    }
  });

  // REST API: Automated Company Bank Statement Extraction & Auditing Sync
  app.post("/api/statements/analyse-bank", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const { sheetRows } = req.body;
      if (!sheetRows || !Array.isArray(sheetRows)) {
        return res.status(400).json({ error: "No valid bank statement records provided." });
      }

      const croppedRows = sheetRows.slice(0, 150);

      const prompt = `You are a chartered forensic auditor processing official corporate bank statement files for a heavy petroleum-chemical logistics transport company.
Analyze these tabular 2D parsed spreadsheet row cell records:
${JSON.stringify(croppedRows)}

Complete double-entry accounting mapping to generate valid Tally AccountingVouchers.
For each transaction, map fields:
- "date" to date (YYYY-MM-DD format). If not visible use "2026-05-24".
- "particulars / description / narration" to narration.
- "chq no / reference id / voucher code" to voucherNo (prepend standard bank transaction voucher prefix, e.g., "TXN-BANK-101").
- "debit / withdrawal OR credit / deposit" to determine direction and assign debitAccount / creditAccount.
  - If it is a deposit / inflow: set debitAccount as "ICICI CORP CURRENT BANK A/C" or "STATE BANK OF INDIA TRANSPORT ACC" and creditAccount as "SUNDRY TRANSPORT RECEIVABLES DEBTORS" or "REVENUE FROM OPERATIONS".
  - If it is a withdrawal / outflow: set debitAccount as "DIRECT FLEET FUEL EXPENSES" or "DIRECT SPARE REPAIR BILLS" or "DRIVER ADVANCES & ALLOWANCES" and creditAccount as "ICICI CORP CURRENT BANK A/C" or "STATE BANK OF INDIA TRANSPORT ACC".
- "amount" to amount (must be positive numeric number, e.g. 150000).

Assemble and structure your response as a JSON array inside a "vouchers" property.
Format:
{
  "vouchers": [
    {
      "id": "generate-unique-uuid-string",
      "type": "Receipt" | "Payment" | "Journal",
      "voucherNo": "TXN-10023",
      "date": "2026-05-24",
      "debitAccount": "ICICI CORP CURRENT BANK A/C",
      "creditAccount": "SUNDRY TRANSPORT RECEIVABLES DEBTORS",
      "amount": 42000,
      "narration": "NEFT Received for Dahej LR-10291"
    }
  ]
}

Return ONLY the raw string conformant to JSON, no markdown wraps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI Bank Statement Analysis Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to audit and parse company bank statement."
      });
    }
  });

  // REST API: Unified AI Intelligent Fleet Assistant, Route Advisor & Financial Copilot
  app.post("/api/ai/cabin", async (req, res) => {
    try {
      const { task, message, chatHistory, context, routeInfo, financeInfo } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: "GEMINI_API_KEY environment variable is not defined in the backend workspace. Please configure it in Settings > Secrets."
        });
      }

      if (task === "chat") {
        // Multi-turn conversational Q&A grounded with live context of the fleet database
        const systemPrompt = `You are \"Aditya\", a highly specialized AI Operations Director & Counselor for Chemical Fleet & Logistics.
You are embedded directly inside the FleetMaster control cabin dashboard.
You have FULL real-time access to the live warehouse and logistics fleet database.

Live Database Context:
${JSON.stringify(context || {})}

Guidelines for your answers:
1. Provide accurate, professional, directly action-oriented, data-proven findings.
2. If asked about tankers, drivers, active routes, bills, repairs or profit, refer strictly to the Live Database Context above to compile real, helpful facts.
3. If they ask to draft notices, communications or alerts, output professional ready-to-copy alerts.
4. Keep visual tone modern, concise, utilizing scannable bullets. No generic preambles. No simulated container server tags in text.
5. Speak objectively and with professional composure.`;

        const contents = [];
        if (chatHistory && Array.isArray(chatHistory)) {
          for (const msg of chatHistory) {
            contents.push({
              role: msg.role === "user" ? "user" : "model",
              parts: [{ text: msg.content }]
            });
          }
        }
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7
          }
        });

        return res.json({
          success: true,
          text: response.text || "No response received from counselor."
        });
      } 
      
      if (task === "route-advisory") {
        // High-end route intelligence counselor
        const { placeFrom, placeTo, loadWeight, productType } = routeInfo || {};
        const routePrompt = `You are a chemical fuel and hazardous substance logistics counselor. Provide an exhaustive, highly specific routing, hazards, and safety advisory.
Route Origin: ${placeFrom || "Ranoli Refinery"}
Route Destination: ${placeTo || "Hazira Port Complex"}
Chemical Substance Payload: ${productType || "Liquid Urea / Light Oil"}
Lorry Fleet Load Weight: ${loadWeight || "24"} Metric Tonnes

Draft an executive Route Advisory in markdown containing:
1. **HAZARDS & TERRAIN RISK ANALYSIS**: Evaluate specific highway segments, sharp gradients (Ghats), heavy monsoon risk, and visual/weather/night transport precautions. Be geographically contextual for typical Indian highway paths (e.g. Surat-Vadodara, Ahmedabad, Mumbai-Pune, Kutch).
2. **POLICE / COMPLIANCE CHECKPOINT ADVISORY**: List crucial toll plazas, border check-posts, and required licensing papers (TREM Cards, chemical storage compliance, state entry taxes).
3. **OPTIMAL FUEL FLUID CONSERVATION TIPS**: Rate speed limits (e.g. 45-50km/hr max loaded), gears on gradients, AdBlue dosing recommendation (recommend 5-6% of diesel consumption), and estimated driving rest periods to avoid sleepiness.

Make the output extremely elegant, readable, using concise display elements.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: routePrompt,
          config: {
            temperature: 0.6
          }
        });

        return res.json({
          success: true,
          text: response.text || "No route counselor report received."
        });
      }

      if (task === "financial-pnl") {
        const pnlPrompt = `You are a veteran chemical transit CFO auditor. Audit this financial breakdown of our active, past logistics, and repair state:
${JSON.stringify(financeInfo || {})}

Provide a highly critical, high-impact tactical diagnostic detailing:
1. **PROFIT LEAK DETECTION**: Spot where our profit margins are bleeding. Look at high diesel costs, excessive maintenance bills, toll spikes, or driver battery charges.
2. **MARGIN OPTIMIZER METRICS**: Rank the fuel economy or cost performance of tankers. Point out the worst performers and potential route pricing issues if freight rate is too low.
3. **3 IMMEDIATE BUSINESS ACTIONS**: Give 3 precise actions (e.g. renegotiating tire supplier Balaji, changing driver incentives, route rerouting) with expected percentage costs trimmed.

Output the analysis in beautiful scannable Markdown.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: pnlPrompt,
          config: {
            temperature: 0.6
          }
        });

        return res.json({
          success: true,
          text: response.text || "No financial audit summary received."
        });
      }

      return res.status(400).json({ error: "Unsupported AI Cabin operation." });
    } catch (error: any) {
      console.error("AI Cabin General Core Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred in the Gemini AI Engine."
      });
    }
  });

  // REST API: AI Multi-Axle Truck Routing & Distance Solver
  app.post("/api/ai/route-calculator", async (req, res) => {
    try {
      const { placeFrom, placeTo, axleCount } = req.body;
      if (!placeFrom || !placeTo) {
        return res.status(400).json({ error: "Missing origin (placeFrom) or destination (placeTo)" });
      }

      const prompt = `You are a professional logistics dispatcher and GIS route-planning auditor specializing in high-capacity chemical cargo truck routing in India.
Analyze the transport path from "${placeFrom}" to "${placeTo}" specifically for a ${axleCount || 5}-axle heavy double-action trailer tanker (GVW up to 48 Tonnes).

Calculate constraints specifically for heavy vehicles:
- Large 5-axle rigs must bypass narrow city corridors, require wide turn radius clearances, have height hurdles (underpasses < 4.5m), and have steep incline/mountain ghat restrictions.
- Calculate realistic toll gate frequencies on national highways (NH) connecting these two locations.
- Suggest optimal stopover junctions safe for overnight commercial truck parking (with secure fuel bays).

Output a structured JSON response matching the following schema precisely:
{
  "distanceKm": 435,
  "routeDescription": "Fastest national highway route description (e.g. NH-48 via Vadodara and Surat flyovers)",
  "durationHours": 11.5,
  "estimatedTollsInr": 1850,
  "bypassPoints": ["Vadodara Golden Chokdi Bypass", "Surat Hazira Outer Ring Road"],
  "safeRestStopovers": ["Bharuch HP Highway Petrol Pump Stop", "Surat Bypass Plaza Compound"],
  "hazardsAndRestrictions": [
    "Steep descent on Bhor Ghat - use low gear with constant exhaust braking",
    "Underpass height barrier warning at Surat City outer entrance (use NH bypass route)"
  ],
  "recommendedAdblueLiters": 24,
  "fuelEfficiencyAdvice": "Maintain an uniform 48 km/h cruise speed on NH corridors to maximize laden tanker fuel averages."
}

Conform strictly to JSON, do not add any markdown formatting or surrounding triple backticks. Return ONLY the raw string conformant to JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI Route Calculator Server Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to solve route distance and hazards."
      });
    }
  });

  // REST API: Parse and Analyse Physical L.R. layout scan and extract design and visual properties
  app.post("/api/lr/analyse-design", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "No physical design layout image file data or mimeType received." });
      }

      const prompt = `You are a professional layout and stationery designer specialized in heavy road freight forwarding.
      Analyze this scanned image or photo of an empty/pre-printed physical Lorry Receipt (L.R.) template design or letterhead paper.
      Extract the design guidelines, print coordinates, physical grid style, primary colors, corporate titles, subtitles, PAN, GSTIN, custom fields, and dimensions so that subsequent receipts can be generated programmatically to align with this pre-printed form beautifully.

      Output a structured JSON response matching this schema precisely:
      {
        "companyName": "Custom company branding name found on template",
        "companySubtitle": "Catchy tagline or secondary descriptor",
        "brandingColorTheme": "Visual color scheme details",
        "layoutStyle": "Preprinted boxes or column boundaries structure",
        "fieldsFoundOnPaper": ["Consigner Name", "Consignee Name", "Cargo Weight", "Destination Address"],
        "customGstin": "GSTIN if printed, else empty",
        "customPan": "PAN if printed, else empty",
        "contactPhone": "Phone if listed, else empty",
        "contactEmail": "Email if listed, else empty",
        "addressLine": "Branding head office address if printed, else empty",
        "aiDesignGuidelines": "A concise directive on how programmatically generated receipts should align their texts to match this physical grid structure."
      }

      Return only clean JSON. Avoid markdown tags such as \`\`\`json.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI L.R Design Template Analyzer Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze physical L.R template design."
      });
    }
  });

  // REST API: Generate bespoke L.R values using design template memory and specific trip details
  app.post("/api/lr/generate-ai-lr", async (req, res) => {
    try {
      const { designMemory, tripDetails } = req.body;
      if (!designMemory) {
        return res.status(400).json({ error: "Missing physical template design memory guidelines." });
      }

      const prompt = `You are an expert logistics AI billing supervisor. Assemble a complete Lorry Receipt (L.R.) matching BOTH the layout style rules of the user's physical preprinted design template and the parameters of the active dispatch trip.

      Physical Design template memory:
      ${JSON.stringify(designMemory)}

      Active Trip cargo Details:
      ${JSON.stringify(tripDetails)}

      Output a structured JSON response matching this schema precisely:
      {
        "lrNo": "A professional auto-generated receipt number matching the company prefix and format guidelines from the template design, e.g. BR-2026-9021",
        "dated": "Date to print (e.g. YYYY-MM-DD)",
        "consignerName": "Best matched consigner sender name",
        "consigneeName": "Best matched consignee recipient name",
        "product": "Product name matching tripDetails, polished for freight records",
        "qty": 25.0,
        "qtyUnit": "MT or KL",
        "placeFrom": "Full pickup point address, e.g. Ranoli GIDC Section",
        "placeTo": "Full unloading point address, e.g. Hazira Port Complex",
        "freightRate": 1350,
        "tankerNumber": "Tanker plate number from tripDetails",
        "totalFreight": 33750,
        "aiMemo": "Detailed positioning or formatting instruction to align this data seamlessly on the pre-printed layout."
      }

      Conform strictly to JSON, do not add any surrounding markdown frames.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const analysisJson = JSON.parse(cleanedJson);

      return res.json({
        success: true,
        data: analysisJson
      });
    } catch (error: any) {
      console.error("AI L.R Generator Failure:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate AI L.R as per preprinted design rules."
      });
    }
  });

  // Global remote expenses repository for direct WhatsApp Webhook entries
  const remoteWhatsAppExpenses: any[] = [];

  // Helper: Send email via standard SMTP (or nodemailer)
  async function sendNotificationEmail(to: string, subject: string, text: string, html?: string) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM_EMAIL || "no-reply@fleetmaster-logistics.com";

    if (!host || !user || !pass) {
      console.warn(`[SMTP CONFIG WARNING] Outgoing credentials missing. Email alert to ${to} was mock-logged to server console.`);
      return {
        sent: false,
        reason: "Credentials missing in environment variables. Provide SMTP_HOST, SMTP_USER, SMTP_PASS inside settings configuration.",
        recipient: to,
        bodyPreview: text.substring(0, 150) + "..."
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user,
          pass
        }
      });

      const info = await transporter.sendMail({
        from: `"Fleet Master Operations" <${from}>`,
        to,
        subject,
        text,
        html: html || undefined
      });

      console.log(`[SMTP SUCCESS] Email sent successfully to ${to}. ID: ${info.messageId}`);
      return { sent: true, messageId: info.messageId, recipient: to };
    } catch (err: any) {
      console.error(`[SMTP ERROR] Failed to send email to ${to}:`, err);
      return { sent: false, error: err.message || "Unknown SMTP error", recipient: to };
    }
  }

  // Helper: Send Twilio SMS or WhatsApp message
  async function sendTwilioMessage(to: string, body: string, isWhatsApp: boolean = false) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromSms = process.env.TWILIO_PHONE_NUMBER;
    const fromWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken) {
      console.warn(`[TWILIO CONFIG WARNING] Credentials missing. WhatsApp/SMS dispatch to ${to} was mock-logged to server console:\n"${body}"`);
      return {
        sent: false,
        reason: "Twilio credentials missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN). Provide them inside settings secrets.",
        recipient: to,
        bodyPreview: body
      };
    }

    try {
      const client = twilio(accountSid, authToken);
      let formattedTo = to.trim();

      if (!formattedTo.startsWith("+")) {
        if (formattedTo.length === 10) {
          formattedTo = "+91" + formattedTo;
        } else if (formattedTo.startsWith("91") && formattedTo.length === 12) {
          formattedTo = "+" + formattedTo;
        }
      }

      const messageOptions: any = { body };

      if (isWhatsApp) {
        messageOptions.to = formattedTo.startsWith("whatsapp:") ? formattedTo : `whatsapp:${formattedTo}`;
        const defaultFrom = fromWhatsapp || "whatsapp:+14155238886";
        messageOptions.from = defaultFrom.startsWith("whatsapp:") ? defaultFrom : `whatsapp:${defaultFrom}`;
      } else {
        messageOptions.to = formattedTo;
        if (!fromSms) {
          throw new Error("TWILIO_PHONE_NUMBER is required for sending SMS text alerts.");
        }
        messageOptions.from = fromSms;
      }

      const res = await client.messages.create(messageOptions);
      console.log(`[TWILIO SUCCESS] Dispatched to ${messageOptions.to}. SID: ${res.sid}`);
      return { sent: true, sid: res.sid, recipient: messageOptions.to };
    } catch (err: any) {
      console.error(`[TWILIO ERROR] Dispatch failure to ${to}:`, err);
      return { sent: false, error: err.message || "Unknown Twilio API error", recipient: to };
    }
  }

  // REST API: Endpoint for newly registered user alerts & logs
  app.post("/api/notify/user-registered", async (req, res) => {
    try {
      const { user } = req.body;
      if (!user || !user.username) {
        return res.status(400).json({ error: "Missing registered user descriptor parameters." });
      }

      const emailResultLogs: any[] = [];
      const twilioResultLogs: any[] = [];

      // 1. Email to registered user
      const userSubject = "Welcome to Fleet Master Petrochem Transport - Account Registered";
      const userBody = `Hello ${user.username || "Carrier Operator"},\n\nYour transporter account under company "${user.company || "DELIVR. LOGISTICS"}" has been successfully created and registered!\n\nCredential details:\n- Username: ${user.username}\n- Password: ${user.password}\n- Registered Contact: ${user.phone || "N/A"}\n- Registered Email: ${user.email || "N/A"}\n\nYou can access your platform control center immediately.\n\nBest Regards,\nFleet Operations Admin Team`;
      
      const userMailRes = await sendNotificationEmail(user.email, userSubject, userBody);
      emailResultLogs.push({ label: "Operator Welcome Email", ...userMailRes });

      // 2. Email registration details to creator stubbornnmohit@gmail.com
      const creatorSubject = `NEW TRANSPORTER REGISTRATION COMPLETED: ${user.company}`;
      const creatorBody = `Transporter Account Registration Deep Audit Alert:\n\n` + 
        `- Company: ${user.company || "N/A"}\n` +
        `- Username: ${user.username || "N/A"}\n` +
        `- Password (Private Plaintext): ${user.password || "N/A"}\n` +
        `- Operator Email: ${user.email || "N/A"}\n` +
        `- Operator Phone: ${user.phone || "N/A"}\n\n` +
        `This account with dispatch authority was registered at ${new Date().toISOString()}. All databases and ledger logs synchronized!`;
      
      const creatorMailRes = await sendNotificationEmail("stubbornnmohit@gmail.com", creatorSubject, creatorBody);
      emailResultLogs.push({ label: "App Creator Audit Email", ...creatorMailRes });

      // 3. WhatsApp to creator (+919723781353)
      const creatorMsgText = `🌟 *NEW TRANSPORTER REGISTERED* 🌟\n\n- *Company Name:* ${user.company || "N/A"}\n- *Username:* ${user.username || "N/A"}\n- *Passcode:* ${user.password || "N/A"}\n- *Email:* ${user.email || "N/A"}\n- *Phone No:* ${user.phone || "N/A"}\n\nRegistered & activated under Carrier format settings successfully!`;
      const creatorWaRes = await sendTwilioMessage("+919723781353", creatorMsgText, true);
      twilioResultLogs.push({ label: "App Creator WhatsApp Alert", ...creatorWaRes });

      // 4. WhatsApp or SMS to newly registered user
      const userMsgText = `🎉 *Welcome to Fleet Master Petrochem!* 🎉\n\nYour dispatcher/operator portal is online.\n- *Username:* ${user.username}\n- *Passcode:* ${user.password}\n\nManage tankers, drivers, live trips & expenses directly from your phone!`;
      const userPhoneStr = user.phone || "+919723781353";
      const userWaRes = await sendTwilioMessage(userPhoneStr, userMsgText, true);
      twilioResultLogs.push({ label: "Registered Operator Welcome WhatsApp", ...userWaRes });

      return res.json({
        success: true,
        message: "Registration alerts successfully compiled & triggered.",
        emails: emailResultLogs,
        twilio: twilioResultLogs
      });
    } catch (e: any) {
      console.error("Failure compiling registration notifications:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // REST API: Endpoint triggered on new trip start
  app.post("/api/notify/trip-started", async (req, res) => {
    try {
      const { trip, userContactPhone } = req.body;
      if (!trip || !trip.id) {
        return res.status(400).json({ error: "Missing trip parameters." });
      }

      const twilioResultLogs: any[] = [];
      const userPhone = userContactPhone || "+919723781353";

      const tripMsgText = `🟢 *VOYAGER TRIP DISPATCHED* 🟢\n\n` +
        `*Trip ID:* ${trip.id}\n` +
        `*Lorry L.R. No:* ${trip.lrNo || "N/A"}\n` +
        `*Tanker Plate:* ${trip.tankerNumber}\n` +
        `*Navigator Driver:* ${trip.driverName}\n` +
        `*Dispatched Route:* ${trip.placeFrom} ➔ ${trip.placeTo}\n` +
        `*Expected fuel load:* ${trip.expectedFuelLiters} L\n` +
        `*Estimated AdBlue limit:* ${trip.expectedAdblueLiters} L\n\n` +
        `💬 *Remote Cash Expense Tracker Helper*:\n` +
        `You can log transit expenses directly to the central ledger at any time by replying to this message in format:\n` +
        `\`Expense <category> <amount> "<detail>"\`\n\n` +
        `*Category Presets:* fuel, repair, adblue, maintenance\n` +
        `*Example reply:* \`Expense repair 2800 "Replacement tyre tube at roadside workshop"\``;

      // WhatsApp to user registered phone
      const userWaRes = await sendTwilioMessage(userPhone, tripMsgText, true);
      twilioResultLogs.push({ label: "Registered User Trip WhatsApp notification", ...userWaRes });

      // WhatsApp copy to creator Mohit
      const creatorWaRes = await sendTwilioMessage("+919723781353", `🚚 Dispatch Alert: Tanker ${trip.tankerNumber} under LR ${trip.lrNo} started on route ${trip.placeFrom} to ${trip.placeTo}. Driver: ${trip.driverName}.`, true);
      twilioResultLogs.push({ label: "Creator Copy WhatsApp", ...creatorWaRes });

      return res.json({
        success: true,
        message: "Trip start notifications processed & dispatched successfully via secure server gateways.",
        channels: twilioResultLogs
      });
    } catch (e: any) {
      console.error("Failure processing trip start notifications:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // REST API: WhatsApp Incoming Webhook (for integration with Twilio WhatsApp sandbox or Webhook number)
  // Highly compliant with Twilio POST body parameters
  app.post("/api/webhook/whatsapp", express.urlencoded({ extended: true }), (req, res) => {
    try {
      const bodyText = req.body.Body || req.body.body || "";
      const fromNumber = req.body.From || req.body.from || "";
      
      console.log(`[INCOMING WHATSAPP WEBHOOK] Message from ${fromNumber}: "${bodyText}"`);

      if (!bodyText) {
        // Handle JSON fallback if URL encoded didn't capture or was sent as raw JSON JSON.parse
        const jsonBody = req.body;
        const fallbackText = jsonBody.text || jsonBody.message || "";
        if (!fallbackText) {
          return res.status(400).send("No body payload text found.");
        }
      }

      // Format matcher: Expense <category> <amount> "<detail>" or Expense <category> <amount> <detail>
      const match = bodyText.match(/expense\s+(fuel|repair|adblue|maintenance|other)\s+(\d+)\s+["']?([^"']+)["']?/i);
      
      if (match) {
        const category = match[1].toLowerCase();
        const amount = parseFloat(match[2]);
        const detail = match[3];

        const newRemoteExpense = {
          id: `EXP-WA-WEBHOOK-${Date.now()}`,
          vendorName: "WhatsApp Webhook Dispatch",
          date: new Date().toISOString().substring(0, 10),
          amount,
          qtyLiters: category === "fuel" ? Math.round(amount / 95) : undefined,
          category,
          workType: category === "fuel" ? "Fuel Refill Slip" : category === "repair" ? "Physical Mechanical Spares" : "Urea / AdBlue Supply",
          detail: `${detail} (Approved via live WhatsApp voice/text webhook)`,
          isVerifiedByAdmin: true,
          billNo: `WA-TXN-${Math.floor(100 + Math.random() * 899)}`,
          whatsappSender: fromNumber
        };

        remoteWhatsAppExpenses.push(newRemoteExpense);
        console.log("[INCOMING WHATSAPP SUCCESS] Synced remote expense object successfully:", newRemoteExpense);

        res.type("text/xml");
        return res.send(`
          <Response>
            <Message>✅ Direct Entry Logged! Registered ${category.toUpperCase()} expense of ₹${amount.toLocaleString()} for "${detail}" successfully. Synced to Central fleet ledger books.</Message>
          </Response>
        `);
      } else {
        res.type("text/xml");
        return res.send(`
          <Response>
            <Message>⚠️ Format mismatch! To register, reply in standard format:\nExpense <category> <amount> "<detail>"\n\nExample:\nExpense fuel 24500 "Loaded 250L at Highway Pump"</Message>
          </Response>
        `);
      }
    } catch (err: any) {
      console.error("[INCOMING WHATSAPP WEBHOOK ERROR] Server exception crashed thread:", err);
      res.type("text/xml");
      return res.send(`
        <Response>
          <Message>⚠️ Error processing remote entry webhook: ${err.message}</Message>
        </Response>
      `);
    }
  });

  // REST API: Frontend queries to fetch newly received WhatsApp webhook expenses
  app.get("/api/expenses/whatsapp-pending", (req, res) => {
    return res.json({ success: true, expenses: remoteWhatsAppExpenses });
  });

  // REST API: frontend clears specific items once integrated locally
  app.post("/api/expenses/whatsapp-approve", (req, res) => {
    const { id } = req.body;
    const index = remoteWhatsAppExpenses.findIndex(e => e.id === id);
    if (index >= 0) {
      remoteWhatsAppExpenses.splice(index, 1);
      return res.json({ success: true });
    }
    return res.status(404).json({ error: "Exp match index empty in temporary in-mem buffer." });
  });

  // Setup Express static/hot middleware depends on environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server with Vite middleware running on port ${PORT}`);
  });
}

startServer();
