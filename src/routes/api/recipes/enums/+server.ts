import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RECIPE_CATEGORIES, RECIPE_SEASONS, RECIPE_TAGS } from '$lib/types.js';

export const GET: RequestHandler = async () => {
  try {
    return json({
      categories: RECIPE_CATEGORIES,
      seasons: RECIPE_SEASONS,
      tags: RECIPE_TAGS,
      tags_by_category: {
        dietary: RECIPE_TAGS.filter(tag => 
          ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'keto', 'paleo', 
           'low-carb', 'low-fat', 'sugar-free', 'low-sodium', 'high-protein'].includes(tag)
        ),
        cuisine: RECIPE_TAGS.filter(tag => 
          ['italian', 'mexican', 'chinese', 'indian', 'thai', 'french', 'mediterranean', 
           'american', 'japanese', 'korean', 'greek', 'spanish', 'middle-eastern', 'cajun', 'southern'].includes(tag)
        ),
        cooking_methods: RECIPE_TAGS.filter(tag => 
          ['baking', 'grilling', 'frying', 'roasting', 'steaming', 'slow-cooking', 'air-fryer', 
           'instant-pot', 'no-cook', 'one-pot', 'stir-fry', 'braising', 'smoking', 'pressure-cooker'].includes(tag)
        ),
        characteristics: RECIPE_TAGS.filter(tag => 
          ['quick', 'easy', 'healthy', 'comfort-food', 'spicy', 'mild', 'sweet', 'savory', 
           'crispy', 'creamy', 'fresh', 'hearty', 'light', 'rich'].includes(tag)
        ),
        occasions: RECIPE_TAGS.filter(tag => 
          ['party', 'holiday', 'weeknight', 'meal-prep', 'kid-friendly', 'date-night', 'potluck', 
           'picnic', 'brunch', 'entertaining', 'budget-friendly', 'leftover-friendly'].includes(tag)
        ),
        proteins: RECIPE_TAGS.filter(tag => 
          ['chicken', 'beef', 'pork', 'fish', 'seafood', 'tofu', 'beans', 'eggs', 'turkey', 
           'lamb', 'duck', 'plant-based'].includes(tag)
        ),
        dish_types: RECIPE_TAGS.filter(tag => 
          ['soup', 'salad', 'sandwich', 'pasta', 'pizza', 'bread', 'cookies', 'cake', 'pie', 
           'smoothie', 'cocktail', 'sauce', 'dip', 'marinade', 'dressing'].includes(tag)
        )
      }
    });
  } catch (error) {
    console.error('Error fetching enum values:', error);
    return json({ error: 'An error occurred while fetching enum values' }, { status: 500 });
  }
};