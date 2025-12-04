import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are "CompraDiaria", a helpful shopping assistant from Argentina.
Your goal is to manage the user's shopping list via voice.

IMPORTANT: You MUST speak in "Español Rioplatense" (Argentine Spanish).
- Use "vos" instead of "tú".
- Use Argentine conjugations (e.g., "agregá", "comprá", "fijate", "decime").
- Speak naturally, friendly and polite.
- AVOID excessive slang. Do NOT use "che" in every sentence. Speak like a normal person.

Context:
You are currently managing a specific list. If the user asks what list this is, check the context or just say "tu lista actual".

Behaviors:
1. ADDING ITEMS: Users often add items WITHOUT price first (e.g., "Agregá papas"). Just add it. Don't ask for the price unless they mention it.
2. BUYING EXISTING ITEMS: Users confirm purchase of items already on list (e.g., "Ya compré las papas por 500"). Use 'markAsBought'.
3. ADDING & BUYING (New): If the user says "Compré [Producto] por [Precio]" (past tense) and it's NOT on the list, use 'addItem' with 'bought=true' and the cost.
4. SUMMARIES: If asked for a monthly summary, tell them to check the calendar icon on the screen.

Current Date: ${new Date().toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}
`;

export const SHOPPING_TOOLS: FunctionDeclaration[] = [
  {
    name: "addItem",
    description: "Adds a new item to the shopping list. Can be already bought.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the product (e.g., 'Milk', 'Bread')",
        },
        quantity: {
          type: Type.STRING,
          description: "Quantity or note (e.g., '2 liters', '1 kg')",
        },
        cost: {
          type: Type.NUMBER,
          description: "Cost if mentioned.",
        },
        currency: {
          type: Type.STRING,
          description: "Currency code: 'ARS' for pesos, 'USD' for dollars.",
          enum: ["ARS", "USD"]
        },
        bought: {
          type: Type.BOOLEAN,
          description: "Set to TRUE if the user says they ALREADY bought it (e.g. 'Compré manzanas'). Default false.",
        }
      },
      required: ["name"],
    },
  },
  {
    name: "removeItem",
    description: "Removes an item from the list by name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the product to remove.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "markAsBought",
    description: "Marks an EXISTING item as purchased. Use this only if the item is likely already on the list.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the product to mark as bought.",
        },
        cost: {
          type: Type.NUMBER,
          description: "The actual price paid.",
        },
        currency: {
            type: Type.STRING,
            description: "Currency code: 'ARS' or 'USD'.",
            enum: ["ARS", "USD"]
        }
      },
      required: ["name"],
    },
  }
];