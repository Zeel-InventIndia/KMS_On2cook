import { Recipe } from '../types/Recipe';

export const mockRecipes: Recipe[] = [
  {
    id: 'recipe-001',
    name: 'Butter Chicken',
    description: 'Rich and creamy tomato-based curry with tender chicken pieces, perfect for demonstrations.',
    category: 'main_course',
    cuisine: 'indian',
    preparationTime: 30,
    cookingTime: 45,
    servings: 4,
    difficulty: 'medium',
    ingredients: [
      '500g chicken breast, cubed',
      '2 tbsp butter',
      '1 onion, diced',
      '3 cloves garlic, minced',
      '1 tbsp ginger paste',
      '400g canned tomatoes',
      '200ml heavy cream',
      '2 tsp garam masala',
      '1 tsp turmeric',
      'Salt and pepper to taste',
      'Fresh cilantro for garnish'
    ],
    instructions: [
      'Marinate chicken with yogurt and spices for 30 minutes',
      'Heat butter in a pan and cook chicken until golden',
      'Remove chicken, sauté onions until soft',
      'Add garlic, ginger, and spices, cook for 1 minute',
      'Add tomatoes, simmer for 15 minutes',
      'Blend sauce until smooth, return to pan',
      'Add cream and chicken, simmer for 10 minutes',
      'Garnish with cilantro and serve hot'
    ],
    tags: ['popular', 'creamy', 'spicy', 'demo-favorite'],
    nutritionalInfo: {
      calories: 420,
      protein: 35,
      carbs: 12,
      fat: 28
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
      videoUrl: 'https://example.com/videos/butter-chicken.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/butter-chicken.json'
    },
    createdBy: 'Akshay',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-08-20T14:30:00Z',
    isPublic: true,
    usageCount: 45,
    rating: 4.8,
    reviews: 23
  },
  {
    id: 'recipe-002',
    name: 'Vegetable Biryani',
    description: 'Aromatic basmati rice cooked with mixed vegetables and traditional spices.',
    category: 'main_course',
    cuisine: 'indian',
    preparationTime: 45,
    cookingTime: 60,
    servings: 6,
    difficulty: 'hard',
    ingredients: [
      '2 cups basmati rice',
      '300g mixed vegetables (carrots, beans, peas)',
      '2 onions, sliced',
      '1/2 cup yogurt',
      '1 tbsp ginger-garlic paste',
      '1 tsp red chili powder',
      '1/2 tsp turmeric',
      '1 tsp garam masala',
      'Saffron soaked in milk',
      'Fresh mint leaves',
      'Ghee and oil',
      'Salt to taste'
    ],
    instructions: [
      'Soak basmati rice for 30 minutes',
      'Fry onions until golden and crispy',
      'Marinate vegetables with yogurt and spices',
      'Cook vegetables until 70% done',
      'Boil rice with whole spices until 80% cooked',
      'Layer rice and vegetables alternately',
      'Sprinkle fried onions, saffron milk, and mint',
      'Cover and cook on dum for 45 minutes',
      'Let it rest for 10 minutes before serving'
    ],
    tags: ['vegetarian', 'aromatic', 'festive', 'healthy'],
    nutritionalInfo: {
      calories: 350,
      protein: 8,
      carbs: 65,
      fat: 12
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d513?w=400',
      videoUrl: 'https://example.com/videos/veg-biryani.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/veg-biryani.json'
    },
    createdBy: 'Rishi',
    createdAt: '2025-02-10T09:15:00Z',
    updatedAt: '2025-08-15T11:20:00Z',
    isPublic: true,
    usageCount: 38,
    rating: 4.6,
    reviews: 19
  },
  {
    id: 'recipe-003',
    name: 'Margherita Pizza',
    description: 'Classic Italian pizza with fresh mozzarella, tomatoes, and basil.',
    category: 'main_course',
    cuisine: 'italian',
    preparationTime: 20,
    cookingTime: 15,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      '1 pizza dough base',
      '1/2 cup tomato sauce',
      '200g fresh mozzarella, sliced',
      '2 tomatoes, sliced',
      'Fresh basil leaves',
      '2 tbsp olive oil',
      'Salt and pepper to taste',
      'Oregano for sprinkling'
    ],
    instructions: [
      'Preheat oven to 250°C',
      'Roll out pizza dough on floured surface',
      'Spread tomato sauce evenly on base',
      'Add mozzarella slices and tomato rounds',
      'Drizzle with olive oil and season',
      'Bake for 12-15 minutes until edges are golden',
      'Top with fresh basil leaves',
      'Cut and serve immediately'
    ],
    tags: ['quick', 'italian', 'vegetarian', 'crowd-pleaser'],
    nutritionalInfo: {
      calories: 280,
      protein: 15,
      carbs: 35,
      fat: 12
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
      videoUrl: 'https://example.com/videos/margherita-pizza.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/margherita-pizza.json'
    },
    createdBy: 'Mandeep',
    createdAt: '2025-03-05T16:45:00Z',
    updatedAt: '2025-08-10T09:30:00Z',
    isPublic: true,
    usageCount: 52,
    rating: 4.7,
    reviews: 31
  },
  {
    id: 'recipe-004',
    name: 'Chocolate Lava Cake',
    description: 'Decadent chocolate dessert with molten center, perfect for special occasions.',
    category: 'dessert',
    cuisine: 'continental',
    preparationTime: 15,
    cookingTime: 12,
    servings: 2,
    difficulty: 'medium',
    ingredients: [
      '100g dark chocolate, chopped',
      '50g butter',
      '1 large egg',
      '1 egg yolk',
      '2 tbsp caster sugar',
      '1 tbsp plain flour',
      'Pinch of salt',
      'Butter for greasing',
      'Vanilla ice cream for serving'
    ],
    instructions: [
      'Preheat oven to 200°C',
      'Grease two ramekins with butter',
      'Melt chocolate and butter in double boiler',
      'Whisk egg, egg yolk, and sugar until pale',
      'Fold in melted chocolate mixture',
      'Sift in flour and salt, mix gently',
      'Divide between ramekins',
      'Bake for 10-12 minutes until edges are firm',
      'Let rest for 1 minute, then invert onto plates',
      'Serve immediately with ice cream'
    ],
    tags: ['dessert', 'chocolate', 'molten', 'impressive'],
    nutritionalInfo: {
      calories: 380,
      protein: 8,
      carbs: 35,
      fat: 24
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400',
      videoUrl: 'https://example.com/videos/lava-cake.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/chocolate-lava-cake.json'
    },
    createdBy: 'Manish',
    createdAt: '2025-04-12T14:20:00Z',
    updatedAt: '2025-08-05T16:10:00Z',
    isPublic: true,
    usageCount: 29,
    rating: 4.9,
    reviews: 15
  },
  {
    id: 'recipe-005',
    name: 'Thai Green Curry',
    description: 'Authentic Thai curry with coconut milk, vegetables, and aromatic herbs.',
    category: 'main_course',
    cuisine: 'thai',
    preparationTime: 25,
    cookingTime: 20,
    servings: 4,
    difficulty: 'medium',
    ingredients: [
      '400ml coconut milk',
      '3 tbsp green curry paste',
      '500g mixed vegetables (eggplant, bell peppers, bamboo shoots)',
      '200g tofu or chicken, cubed',
      '2 tbsp fish sauce',
      '1 tbsp palm sugar',
      '4-5 Thai basil leaves',
      '2 kaffir lime leaves',
      '1 red chili, sliced',
      'Jasmine rice for serving'
    ],
    instructions: [
      'Heat thick coconut milk in a wok',
      'Add curry paste and fry until fragrant',
      'Add protein and cook until nearly done',
      'Pour remaining coconut milk and bring to boil',
      'Add hard vegetables first, then softer ones',
      'Season with fish sauce and palm sugar',
      'Add lime leaves and Thai basil',
      'Garnish with chili and serve with rice'
    ],
    tags: ['spicy', 'coconut', 'healthy', 'authentic'],
    nutritionalInfo: {
      calories: 320,
      protein: 12,
      carbs: 18,
      fat: 24
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400',
      videoUrl: 'https://example.com/videos/thai-green-curry.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/thai-green-curry.json'
    },
    createdBy: 'Pran Krishna',
    createdAt: '2025-05-18T11:30:00Z',
    updatedAt: '2025-08-12T13:45:00Z',
    isPublic: true,
    usageCount: 34,
    rating: 4.5,
    reviews: 18
  },
  {
    id: 'recipe-006',
    name: 'Quinoa Buddha Bowl',
    description: 'Healthy and nutritious bowl with quinoa, roasted vegetables, and tahini dressing.',
    category: 'main_course',
    cuisine: 'fusion',
    preparationTime: 15,
    cookingTime: 30,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      '1 cup quinoa',
      '1 sweet potato, cubed',
      '1 cup broccoli florets',
      '1/2 cup chickpeas',
      '2 tbsp olive oil',
      '1/4 cup tahini',
      '2 tbsp lemon juice',
      '1 tbsp honey',
      '1 clove garlic, minced',
      'Mixed greens',
      'Pumpkin seeds for garnish'
    ],
    instructions: [
      'Cook quinoa according to package instructions',
      'Toss vegetables with olive oil and roast at 200°C for 25 minutes',
      'Whisk tahini, lemon juice, honey, and garlic for dressing',
      'Arrange quinoa in bowls',
      'Top with roasted vegetables and chickpeas',
      'Add fresh greens',
      'Drizzle with tahini dressing',
      'Garnish with pumpkin seeds'
    ],
    tags: ['healthy', 'vegan', 'protein-rich', 'colorful'],
    nutritionalInfo: {
      calories: 420,
      protein: 15,
      carbs: 55,
      fat: 18
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      videoUrl: 'https://example.com/videos/quinoa-buddha-bowl.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/quinoa-buddha-bowl.json'
    },
    createdBy: 'Shahid',
    createdAt: '2025-06-22T08:15:00Z',
    updatedAt: '2025-08-18T10:20:00Z',
    isPublic: true,
    usageCount: 26,
    rating: 4.4,
    reviews: 12
  },
  {
    id: 'recipe-007',
    name: 'Mango Lassi',
    description: 'Refreshing Indian yogurt-based drink with ripe mangoes and cardamom.',
    category: 'beverage',
    cuisine: 'indian',
    preparationTime: 10,
    cookingTime: 0,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      '2 ripe mangoes, peeled and chopped',
      '1 cup Greek yogurt',
      '1/2 cup milk',
      '3 tbsp sugar or honey',
      '1/4 tsp cardamom powder',
      'Ice cubes',
      'Chopped pistachios for garnish',
      'Mint leaves for decoration'
    ],
    instructions: [
      'Blend mangoes until smooth',
      'Add yogurt, milk, and sweetener',
      'Add cardamom powder and blend again',
      'Adjust consistency with milk if needed',
      'Taste and adjust sweetness',
      'Serve over ice in tall glasses',
      'Garnish with pistachios and mint',
      'Serve immediately'
    ],
    tags: ['refreshing', 'summer', 'healthy', 'quick'],
    nutritionalInfo: {
      calories: 180,
      protein: 8,
      carbs: 35,
      fat: 3
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400',
      videoUrl: 'https://example.com/videos/mango-lassi.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/mango-lassi.json'
    },
    createdBy: 'Kishore',
    createdAt: '2025-07-05T15:30:00Z',
    updatedAt: '2025-08-14T12:15:00Z',
    isPublic: true,
    usageCount: 41,
    rating: 4.6,
    reviews: 22
  },
  {
    id: 'recipe-008',
    name: 'Paneer Tikka',
    description: 'Marinated cottage cheese cubes grilled to perfection with Indian spices.',
    category: 'appetizer',
    cuisine: 'indian',
    preparationTime: 30,
    cookingTime: 15,
    servings: 4,
    difficulty: 'medium',
    ingredients: [
      '300g paneer, cubed',
      '1/2 cup Greek yogurt',
      '1 tbsp ginger-garlic paste',
      '1 tsp red chili powder',
      '1/2 tsp turmeric',
      '1 tsp garam masala',
      '1 tbsp lemon juice',
      '2 tbsp oil',
      '1 bell pepper, cubed',
      '1 onion, cubed',
      'Salt to taste',
      'Chat masala for sprinkling'
    ],
    instructions: [
      'Mix yogurt with all spices and lemon juice',
      'Marinate paneer cubes for 30 minutes',
      'Thread paneer, peppers, and onions on skewers',
      'Brush with oil',
      'Grill or bake at 200°C for 12-15 minutes',
      'Turn halfway through cooking',
      'Sprinkle with chat masala',
      'Serve hot with mint chutney'
    ],
    tags: ['grilled', 'protein-rich', 'spicy', 'appetizer'],
    nutritionalInfo: {
      calories: 220,
      protein: 14,
      carbs: 8,
      fat: 16
    },
    media: {
      imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400',
      videoUrl: 'https://example.com/videos/paneer-tikka.mp4',
      jsonUrl: 'https://api.on2cook.com/recipes/paneer-tikka.json'
    },
    createdBy: 'Vikas',
    createdAt: '2025-07-20T13:45:00Z',
    updatedAt: '2025-08-22T09:30:00Z',
    isPublic: true,
    usageCount: 33,
    rating: 4.7,
    reviews: 16
  }
];

// Helper functions for recipe repository
export const getRecipesByCategory = (category: string) => {
  return mockRecipes.filter(recipe => recipe.category === category);
};

export const getRecipesByCuisine = (cuisine: string) => {
  return mockRecipes.filter(recipe => recipe.cuisine === cuisine);
};

export const getPopularRecipes = (limit: number = 5) => {
  return mockRecipes
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
};

export const searchRecipes = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return mockRecipes.filter(recipe => 
    recipe.name.toLowerCase().includes(lowercaseQuery) ||
    recipe.description.toLowerCase().includes(lowercaseQuery) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(lowercaseQuery))
  );
};