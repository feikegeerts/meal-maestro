import { randomUUID } from "node:crypto";

export const sampleRecipes = [
  {
    title: "E2E Voorbeeld - Appeltaart",
    servings: 8,
    category: "dessert",
    season: "year-round",
    description: "Schil de appels, voeg kaneel toe en bak de taart goudbruin.",
    ingredients: [
      {
        id: randomUUID(),
        name: "appels",
        amount: 4,
        unit: "pieces",
        notes: "geschild",
      },
    ],
  },
  {
    title: "E2E Voorbeeld - Tomatensoep",
    servings: 4,
    category: "lunch",
    season: "summer",
    description: "Fruit ui en knoflook, voeg tomaten toe en laat zacht koken.",
    ingredients: [
      {
        id: randomUUID(),
        name: "tomaten",
        amount: 6,
        unit: "pieces",
        notes: "rijp",
      },
    ],
  },
  {
    title: "E2E Voorbeeld - Pannenkoeken",
    servings: 4,
    category: "breakfast",
    season: "year-round",
    description: "Meng bloem, melk en ei tot een glad beslag en bak dunne pannenkoeken.",
    ingredients: [
      {
        id: randomUUID(),
        name: "bloem",
        amount: 200,
        unit: "g",
        notes: "",
      },
    ],
  },
] as const;
