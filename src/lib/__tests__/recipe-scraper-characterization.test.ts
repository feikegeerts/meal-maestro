import { RecipeScraper } from "../recipe-scraper";
import { http, HttpResponse } from "msw";
import { server } from "@/__mocks__/server";

describe("RecipeScraper characterization (real implementation)", () => {
  const baseUrl = "https://char-test.com";

  afterEach(() => {
    // Handlers reset automatically in global afterEach, but explicit clarity helps here.
  });

  test("extracts minimal JSON-LD recipe (name + ingredients + instructions array of strings)", async () => {
    server.use(
      http.get(`${baseUrl}/jsonld-basic`, () => {
        return HttpResponse.html(`
          <html><head>
            <script type="application/ld+json">{
              "@type": "Recipe",
              "name": "Basic Pancakes",
              "recipeIngredient": ["1 cup flour", "2 eggs"],
              "recipeInstructions": ["Mix", "Cook"]
            }</script>
          </head><body></body></html>`);
      })
    );

    const res = await RecipeScraper.scrapeRecipe(`${baseUrl}/jsonld-basic`);
    expect(res.success).toBe(true);
    expect(res.source).toBe("json-ld");
    expect(res.data?.title).toBe("Basic Pancakes");
    expect(res.data?.ingredients).toEqual(["1 cup flour", "2 eggs"]);
    // Instructions become description joined with blank line(s)
    expect(res.data?.description).toContain("Mix");
    expect(res.data?.description).toContain("Cook");
  });

  test("normalizes JSON-LD recipe with object image + instruction objects", async () => {
    server.use(
      http.get(`${baseUrl}/jsonld-complex`, () => {
        return HttpResponse.html(`
          <html><head>
            <script type="application/ld+json">{
              "@type": "Recipe",
              "name": "Complex Lasagna",
              "image": {"url": "https://img.example.com/lasagna.jpg"},
              "recipeYield": "8 servings",
              "recipeCuisine": ["Italian"],
              "recipeCategory": ["Dinner"],
              "recipeIngredient": ["500 gr beef", "250 gr cheese"],
              "recipeInstructions": [
                {"@type": "HowToStep", "text": "Prep sauce"},
                {"@type": "HowToStep", "text": "Layer + bake"}
              ]
            }</script>
          </head><body></body></html>`);
      })
    );

    const res = await RecipeScraper.scrapeRecipe(`${baseUrl}/jsonld-complex`);
    expect(res.success).toBe(true);
    expect(res.source).toBe("json-ld");
    expect(res.data?.title).toBe("Complex Lasagna");
    expect(res.data?.image).toMatch(/lasagna\.jpg$/);
    // Current implementation uses parseInt on "8 servings" and gets 8.
    // Characterize that behavior explicitly.
    expect(res.data?.servings).toBe(8);
    expect(res.data?.cuisine).toBe("italian");
    expect(res.data?.category).toBe("dinner");
    expect(res.data?.ingredients).toEqual(["500 gr beef", "250 gr cheese"]);
    expect(res.data?.description).toContain("Prep sauce");
    expect(res.data?.description).toContain("Layer + bake");
  });

  test("falls back to text extraction when no JSON-LD or meta tags produce data", async () => {
    server.use(
      http.get(`${baseUrl}/text-only`, () => {
        return HttpResponse.html(`
          <html><head><title>Rustic Bread</title></head>
          <body>
            <main>
              <h1>Rustic Bread</h1>
              <p>This is a long descriptive paragraph about making rustic bread with a crunchy crust and open crumb.</p>
              <p>Ingredients: 500g flour, 350g water, 10g salt, 2g yeast. Method involves autolyse and stretch & fold.</p>
              <p>Steps: Mix. Rest. Fold. Proof. Bake.</p>
            </main>
          </body></html>`);
      })
    );

    const res = await RecipeScraper.scrapeRecipe(`${baseUrl}/text-only`);
    expect(res.success).toBe(true);
    expect(res.source).toBe("text-extraction");
    expect(res.data?.title).toBe("Rustic Bread");
    expect(res.data?.description).toMatch(/crunchy crust/);
    // Ingredients intentionally NOT auto-parsed here (left to AI); ensure none present.
    expect(res.data?.ingredients).toBeUndefined();
  });

  test("meta tags fallback triggers only if text extraction fails to produce sufficient content", async () => {
    server.use(
      http.get(`${baseUrl}/meta-only`, () => {
        return HttpResponse.html(`
          <html><head>
            <meta property="og:title" content="Meta Brownies" />
            <meta property="og:description" content="Rich chewy brownies" />
          </head><body><div>Short.</div></body></html>`);
      })
    );

    const res = await RecipeScraper.scrapeRecipe(`${baseUrl}/meta-only`);
    // Text extraction should deem content < 100 chars and fail; then meta tags succeed.
    expect(res.success).toBe(true);
    expect(res.source).toBe("meta-tags");
    expect(res.data?.title).toBe("Meta Brownies");
    expect(res.data?.description).toBe("Rich chewy brownies");
  });

  test("ingredient parsing helper returns structured fields including fractions and decimals", () => {
    const raw = [
      "1 cup flour",
      "2.5 tbsp olive oil",
      "1/2tsp salt", // current regex will fail to separate unit properly due to no space; characterizing outcome
      "Pinch of sugar", // no amount
    ];
    const structured = RecipeScraper.parseIngredientsToStructured(raw);
    expect(structured[0].amount).toBe(1);
    expect(structured[0].unit).toBe("cup");
    expect(structured[1].amount).toBe(2.5);
    expect(structured[1].unit).toBe("tbsp");
    // Current regex correctly interprets simple fraction at start (1/2) yielding 0.5 but merges unit+remainder ("tsp").
    expect(structured[2].amount).toBe(0.5);
    expect(structured[2].unit).toBeDefined();
    expect(structured[3].amount).toBeNull();
    expect(structured[3].unit).toBeNull();
  });

  test("URL title extraction used when fetch blocked returns title in data payload", async () => {
    server.use(
      http.get(
        `${baseUrl}/fancy-chocolate-cake`,
        () => new HttpResponse(null, { status: 403 })
      )
    );
    const res = await RecipeScraper.scrapeRecipe(
      `${baseUrl}/fancy-chocolate-cake?tracking=abc`
    );
    expect(res.success).toBe(false);
    // Depending on error mapping, source may be 'blocked' or 'failed'; accept either but ensure title present.
    expect(["blocked", "failed"]).toContain(res.source);
    expect(res.data?.title).toBe("Fancy Chocolate Cake");
  });

  test("JSON-LD with image array and numeric string recipeYield parses servings and first image", async () => {
    server.use(
      http.get(`${baseUrl}/jsonld-image-array`, () => {
        return HttpResponse.html(`
          <html><head>
            <script type="application/ld+json">{
              "@type": "Recipe",
              "name": "Image Array Salad",
              "image": ["https://img.example.com/salad-1.jpg", "https://img.example.com/salad-2.jpg"],
              "recipeYield": "12",
              "recipeIngredient": ["100 gr lettuce"],
              "recipeInstructions": ["Wash", "Serve"]
            }</script>
          </head><body></body></html>`);
      })
    );

    const res = await RecipeScraper.scrapeRecipe(
      `${baseUrl}/jsonld-image-array`
    );
    expect(res.success).toBe(true);
    expect(res.source).toBe("json-ld");
    expect(res.data?.title).toBe("Image Array Salad");
    // parseInt("12") -> 12
    expect(res.data?.servings).toBe(12);
    expect(res.data?.image).toBe("https://img.example.com/salad-1.jpg");
    expect(res.data?.ingredients).toEqual(["100 gr lettuce"]);
    expect(res.data?.description).toContain("Wash");
  });
});
