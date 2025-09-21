export interface DemoRecipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string[];
  tags: string[];
  category: string;
  prepTime: number;
  cookTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  image?: string;
}

export interface DemoUrlSource {
  url: string;
  title: string;
  description: string;
  type: 'recipe' | 'blog' | 'video';
  isSupported: boolean;
}

export const demoRecipes: DemoRecipe[] = [
  {
    id: '1',
    title: 'Classic Pasta Carbonara',
    description: 'Creamy Roman pasta dish with eggs, cheese, and pancetta',
    servings: 4,
    ingredients: [
      { name: 'Spaghetti', amount: 400, unit: 'g' },
      { name: 'Pancetta', amount: 150, unit: 'g' },
      { name: 'Eggs', amount: 3, unit: 'whole' },
      { name: 'Parmesan cheese', amount: 100, unit: 'g' },
      { name: 'Black pepper', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Cook pasta in salted boiling water until al dente',
      'Fry pancetta until crispy',
      'Whisk eggs with grated parmesan',
      'Combine hot pasta with pancetta',
      'Add egg mixture off heat, tossing quickly',
    ],
    tags: ['Italian', 'Quick', 'Comfort Food'],
    category: 'Main Course',
    prepTime: 10,
    cookTime: 15,
    difficulty: 'Medium',
  },
  {
    id: '2',
    title: 'Chocolate Chip Cookies',
    description: 'Soft and chewy homemade cookies with chocolate chips',
    servings: 24,
    ingredients: [
      { name: 'Flour', amount: 300, unit: 'g' },
      { name: 'Butter', amount: 200, unit: 'g' },
      { name: 'Brown sugar', amount: 150, unit: 'g' },
      { name: 'Eggs', amount: 2, unit: 'whole' },
      { name: 'Chocolate chips', amount: 200, unit: 'g' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Cream butter and brown sugar',
      'Add eggs and vanilla',
      'Mix in flour gradually',
      'Fold in chocolate chips',
      'Bake at 180°C for 12 minutes',
    ],
    tags: ['Dessert', 'Baking', 'Sweet'],
    category: 'Dessert',
    prepTime: 20,
    cookTime: 12,
    difficulty: 'Easy',
  },
  {
    id: '3',
    title: 'Thai Green Curry',
    description: 'Aromatic and spicy coconut curry with vegetables',
    servings: 6,
    ingredients: [
      { name: 'Green curry paste', amount: 3, unit: 'tbsp' },
      { name: 'Coconut milk', amount: 400, unit: 'ml' },
      { name: 'Chicken breast', amount: 500, unit: 'g' },
      { name: 'Eggplant', amount: 2, unit: 'whole' },
      { name: 'Thai basil', amount: 30, unit: 'g' },
      { name: 'Fish sauce', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Fry curry paste in oil',
      'Add thick coconut milk',
      'Add chicken and cook through',
      'Add vegetables and remaining coconut milk',
      'Season with fish sauce and sugar',
      'Garnish with Thai basil',
    ],
    tags: ['Thai', 'Spicy', 'Coconut'],
    category: 'Main Course',
    prepTime: 15,
    cookTime: 25,
    difficulty: 'Medium',
  },
  {
    id: '4',
    title: 'Mediterranean Quinoa Salad',
    description: 'Fresh and healthy salad with quinoa, vegetables, and feta',
    servings: 4,
    ingredients: [
      { name: 'Quinoa', amount: 200, unit: 'g' },
      { name: 'Cherry tomatoes', amount: 250, unit: 'g' },
      { name: 'Cucumber', amount: 1, unit: 'whole' },
      { name: 'Feta cheese', amount: 150, unit: 'g' },
      { name: 'Olive oil', amount: 4, unit: 'tbsp' },
      { name: 'Lemon juice', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Cook quinoa according to package instructions',
      'Dice cucumber and halve cherry tomatoes',
      'Crumble feta cheese',
      'Whisk olive oil with lemon juice',
      'Combine all ingredients',
      'Season with salt and pepper',
    ],
    tags: ['Healthy', 'Vegetarian', 'Mediterranean'],
    category: 'Salad',
    prepTime: 20,
    cookTime: 15,
    difficulty: 'Easy',
  },
];

export const demoUrlSources: DemoUrlSource[] = [
  {
    url: 'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/',
    title: 'Cheesy Chicken Broccoli Casserole',
    description: 'A popular AllRecipes casserole with over 1000 reviews',
    type: 'recipe',
    isSupported: true,
  },
  {
    url: 'https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524',
    title: 'Alton Brown&apos;s Baked Mac and Cheese',
    description: 'Food Network&apos;s science-based approach to mac and cheese',
    type: 'recipe',
    isSupported: true,
  },
  {
    url: 'https://www.youtube.com/watch?v=jVhg6rXIDbE',
    title: 'Gordon Ramsay&apos;s Perfect Scrambled Eggs',
    description: 'YouTube cooking tutorial by celebrity chef',
    type: 'video',
    isSupported: false,
  },
  {
    url: 'https://cooking.nytimes.com/recipes/1017937-chocolate-chip-cookies',
    title: 'NYT Chocolate Chip Cookies',
    description: 'The New York Times famous cookie recipe',
    type: 'recipe',
    isSupported: true,
  },
  {
    url: 'https://www.seriouseats.com/the-best-slow-cooked-bolognese-sauce-recipe',
    title: 'The Best Slow-Cooked Bolognese',
    description: 'Serious Eats detailed analysis and recipe',
    type: 'blog',
    isSupported: true,
  },
];

export const getCategoryRecipes = (category: string) =>
  demoRecipes.filter(recipe => recipe.category.toLowerCase() === category.toLowerCase());

export const getRecipesByTag = (tag: string) =>
  demoRecipes.filter(recipe =>
    recipe.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );

export const searchRecipes = (query: string) =>
  demoRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(query.toLowerCase()) ||
    recipe.description.toLowerCase().includes(query.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  );

export const scaleRecipe = (recipe: DemoRecipe, newServings: number): DemoRecipe => {
  const scaleFactor = newServings / recipe.servings;

  return {
    ...recipe,
    servings: newServings,
    ingredients: recipe.ingredients.map(ingredient => ({
      ...ingredient,
      amount: Math.round((ingredient.amount * scaleFactor) * 100) / 100,
    })),
  };
};

export const getAllTags = () => {
  const allTags = demoRecipes.flatMap(recipe => recipe.tags);
  return [...new Set(allTags)].sort();
};

export const getAllCategories = () => {
  const allCategories = demoRecipes.map(recipe => recipe.category);
  return [...new Set(allCategories)].sort();
};