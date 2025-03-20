import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { FoodItemType } from '@/app/types/food-item';
import {
  Recipe,
  OpenAIRecipeResponse,
} from '@/app/types/ai-recipe-types';
import OpenAI from 'openai';

export async function getAiRecipes(ingredients: FoodItemType[]) {
  console.log('Getting recipes from OpenAI using ingredients');
  const ingredientsArray = ingredients.map((item) => item.name);
  const prompt = `
You are a helpful AI chef. Please create a detailed and structured recipe using the following ingredients: ${ingredientsArray.join(
    ', '
  )}.

Return the recipe as a JSON object with the following structure:
{
  "title": "Recipe Name",
  "ingredients": [
    "List item 1",
    "List item 2"
  ],
  "instructions": "Step-by-step cooking process",
  "emoji": "A relevant emoji",
  "tip": "A useful cooking tip"
}
`.trim();

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful chef assistant that responds in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    const generatedText = response.choices[0].message.content;
    console.log('Generated Text:', generatedText);
    return [
      {
        recipeDetails: generatedText,
        foodList: ingredients,
      },
    ];
  } catch (err) {
    console.error('Error fetching from OpenAI:', err);
  }
  return [
    {
      recipeDetails: 'Could not generate AI recipe suggestions',
      foodList: ingredients,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const { ingredients } = await request.json();

    if (!ingredients) {
      return NextResponse.json(
        { error: 'No ingredients provided' },
        { status: 400 }
      );
    }

    console.log('Generating recipes for ingredients:', ingredients);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse ingredient strings into a cleaner format
    function parseIngredients(ingredientText: string) {
      return ingredientText.split(',').map((item) => item.trim());
    }

    const ingredientList = parseIngredients(ingredients);

    // Search database for recipes with matching ingredients
    const { data: dbRecipes, error: dbError } = await supabase
      .from('recipes')
      .select('*');

    if (dbError) {
      console.error('Error fetching recipes from database:', dbError);
    }

    let matchingRecipes = [];
    let numDbRecipes = 0;

    // If we have database recipes, score and sort them
    if (dbRecipes && dbRecipes.length > 0) {
      // Calculate match scores for each recipe
      const scoredRecipes = dbRecipes.map((recipe) => {
        let matchCount = 0;
        let recipeIngredients = '';

        // Handle different recipe formats (ingredients could be string or array)
        if (typeof recipe.ingredients === 'string') {
          recipeIngredients = recipe.ingredients.toLowerCase();
        } else if (Array.isArray(recipe.ingredients)) {
          recipeIngredients = recipe.ingredients
            .join(' ')
            .toLowerCase();
        }

        // Count matching ingredients
        ingredientList.forEach((ingredient) => {
          if (recipeIngredients.includes(ingredient.toLowerCase())) {
            matchCount++;
          }
        });

        return {
          ...recipe,
          matchScore: matchCount,
          matchPercentage: Math.round(
            (matchCount / ingredientList.length) * 100
          ),
        };
      });

      // Filter recipes with at least one matching ingredient
      matchingRecipes = scoredRecipes
        .filter((recipe) => recipe.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      numDbRecipes = Math.min(matchingRecipes.length, 3);
      console.log(
        `Found ${numDbRecipes} matching recipes in database`
      );
    }

    // Format database recipes to match our response format
    const formattedDbRecipes = matchingRecipes
      .slice(0, numDbRecipes)
      .map((recipe) => ({
        title: recipe.title,
        ingredients: Array.isArray(recipe.ingredients)
          ? recipe.ingredients
          : recipe.ingredients
              .split(',')
              .map((i: string) => i.trim()),
        instructions: recipe.instructions,
        emoji: recipe.emoji || '🍲',
        matchScore: recipe.matchScore,
        matchPercentage: recipe.matchPercentage,
        source: 'database',
        id: recipe.id,
      }));

    // If we have 3+ matching recipes, return those
    if (numDbRecipes >= 3) {
      return NextResponse.json({ recipes: formattedDbRecipes });
    }

    // Otherwise, we need to generate AI recipes
    const numAiRecipesNeeded = 3;
    console.log(`Generating ${numAiRecipesNeeded} AI recipes`);

    // Update to include the type:
    let aiRecipes: Recipe[] = [];

    try {
      console.log('Initializing OpenAI client');

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `
Generate ${numAiRecipesNeeded} unique recipes using these ingredients: ${ingredients}

Create recipes that would realistically use as many of these ingredients as possible.
For each recipe provide:
1. A creative, appetizing title
2. A list of ingredients (including those from the provided list plus basic pantry items)
3. Clear step-by-step cooking instructions

Format your response as a JSON object with an array of recipes like this:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "ingredients": ["Ingredient 1", "Ingredient 2"],
      "instructions": "Step-by-step cooking process"
    }
  ]
}
`.trim();

      console.log('Calling OpenAI API...');

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful chef assistant that responds in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      const generatedText = response.choices[0].message.content;
      console.log('Generated Text:', generatedText);

      console.log('Received response from OpenAI');

      // Try to parse the response
      if (generatedText) {
        // Parse recipes without images
        let parsedRecipes = parseGeneratedRecipes(
          generatedText,
          numAiRecipesNeeded
        );

        console.log(
          `Found ${parsedRecipes.length} recipes in OpenAI response`
        );

        // Map over recipes and add images
        aiRecipes = await Promise.all(
          parsedRecipes.map(async (recipe, index) => {
            try {
              // Try to get image from Spoonacular
              const imageUrl = await getSpoonacularImage(
                recipe.title,
                index
              );
              return { ...recipe, imageUrl };
            } catch (imageError) {
              console.error(
                `Error fetching image for recipe ${index + 1}: ${
                  recipe.title
                }`,
                imageError
              );

              // Fall back to using Unsplash (which is also async)
              try {
                const fallbackImageUrl = await getRecipeImage(
                  recipe,
                  index
                );
                return { ...recipe, imageUrl: fallbackImageUrl };
              } catch (fallbackError) {
                console.error(
                  `Fallback image also failed for recipe ${
                    index + 1
                  }`,
                  fallbackError
                );
                // Use a simple static fallback as last resort
                return {
                  ...recipe,
                  imageUrl: `/images/recipes/fallback-${
                    (index % 5) + 1
                  }.jpg`,
                };
              }
            }
          })
        );
      } else {
        console.error('Generated text is null');
        aiRecipes = [];
      }
      console.log(
        `Successfully parsed ${aiRecipes.length} AI recipes`
      );

      // If we couldn't parse enough recipes, use fallbacks
      if (aiRecipes.length < numAiRecipesNeeded) {
        console.log('Not enough recipes parsed, adding fallbacks');
        const fallbackRecipes = generateFallbackRecipes(
          ingredientList,
          numAiRecipesNeeded - aiRecipes.length
        );
        aiRecipes = [...aiRecipes, ...fallbackRecipes];
      }
    } catch (aiError) {
      console.error('Error generating AI recipes:', aiError);
      console.log('Using fallback recipes instead');

      // Use fallback recipes instead of failing
      aiRecipes = generateFallbackRecipes(
        ingredientList,
        numAiRecipesNeeded
      );
    }

    // Update the image fetching code with absolute URL
    const recipesWithImages = await Promise.all(
      aiRecipes.map(async (recipe, index) => {
        console.log(
          `Fetching image for recipe ${index + 1}: ${recipe.title}`
        );
        try {
          // Use absolute URL for API endpoint
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000';
          const imageResponse = await fetch(
            `${baseUrl}/api/ai-image`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: recipe.title || '',
                ingredients: recipe.ingredients || [],
              }),
            }
          );

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            console.log(
              `Image for recipe ${index + 1}:`,
              imageData.imageUrl
            );
            return {
              ...recipe,
              imageUrl: imageData.imageUrl,
            };
          }
        } catch (error) {
          console.error(
            `Error fetching image for recipe ${index + 1}:`,
            error
          );
        }
        return recipe;
      })
    );

    const allRecipes = [...formattedDbRecipes, ...recipesWithImages];

    // Save the recipe generation history
    const { error: historyError } = await supabase
      .from('recipe_generation_history')
      .insert({
        user_id: user.id,
        ingredients: ingredientList,
        recipes: allRecipes,
      });

    if (historyError) {
      console.error(
        'Error saving recipe generation history:',
        historyError
      );

    }
    return NextResponse.json({ recipes: allRecipes });
  } catch (error) {
    console.error('Error generating recipes:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipes' },
      { status: 500 }
    );
  }
}

function parseGeneratedRecipes(
  generatedText: string,
  numRecipes: number
): Recipe[] {
  try {
    // Try parsing the response as JSON first
    const jsonResponse = JSON.parse(generatedText);

    // Check if we have a recipes array (format we're requesting from OpenAI)
    if (jsonResponse.recipes && Array.isArray(jsonResponse.recipes)) {
      console.log(
        `Found ${jsonResponse.recipes.length} recipes in OpenAI response`
      );

      // Process each recipe in the array with proper typing
      const recipes = jsonResponse.recipes
        .slice(0, numRecipes)
        .map((recipeData: OpenAIRecipeResponse, index: number) => {
          // Create recipe object with our Recipe interface
          const recipe: Recipe = {
            title: recipeData.title || 'Untitled Recipe',
            ingredients: Array.isArray(recipeData.ingredients)
              ? recipeData.ingredients
              : recipeData.ingredients?.split('\n') || [],
            instructions: recipeData.instructions || '',
            source: 'ai',
            imageUrl: '',
          };

          return recipe;
        });

      // Add the images asynchronously and return
      return recipes;
    }

    if (
      jsonResponse.title &&
      jsonResponse.ingredients &&
      jsonResponse.instructions
    ) {
      console.log('Found single recipe in OpenAI response');

      const recipe: Recipe = {
        title: jsonResponse.title,
        ingredients: Array.isArray(jsonResponse.ingredients)
          ? jsonResponse.ingredients
          : jsonResponse.ingredients.split('\n'),
        instructions: jsonResponse.instructions,
        source: 'ai',
        imageUrl: '',
      };

      return [recipe];
    }

    console.log('Using regex parsing as fallback');
    return parseWithRegex(generatedText, numRecipes);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    // If JSON parsing fails, try the regex approach
    return parseWithRegex(generatedText, numRecipes);
  }
}

function parseWithRegex(
  generatedText: string,
  numRecipes: number
): Recipe[] {
  const recipes: Recipe[] = [];
  const recipeRegex =
    /Recipe \d+:\s*Title:\s*(.*?)\s*Ingredients:\s*([\s\S]*?)\s*Instructions:\s*([\s\S]*?)\s*Emoji:\s*(.*?)(?=\nRecipe \d+:|$)/g;
  let match;

  while (
    (match = recipeRegex.exec(generatedText)) !== null &&
    recipes.length < numRecipes
  ) {
    const [_, title, ingredients, instructions, emoji] = match;

    recipes.push({
      title: title.trim(),
      ingredients: ingredients
        .split('\n')
        .map((i: string) => i.replace(/^- /, '').trim())
        .filter(Boolean),
      instructions: instructions.trim(),
      source: 'ai',
      imageUrl: '',
    });
  }

  return recipes;
}

// Update in generateFallbackRecipes similarly:
function generateFallbackRecipes(
  ingredients: string[],
  count: number
): Recipe[] {
  // Generate hardcoded recipes based on the ingredients
  const recipes: Recipe[] = [];

  // Template recipes that can work with any ingredients
  const templates = [
    {
      title: (ing: string[]) => `${ing[0] || 'Quick'} Stir Fry`,
      ingredients: (ing: string[]) => [
        ...ing,
        '2 tablespoons vegetable oil',
        '2 cloves garlic, minced',
        '1 tablespoon soy sauce',
        '1 teaspoon sesame oil',
        'Salt and pepper to taste',
      ],
      instructions: (ing: string[]) =>
        `
1. Heat vegetable oil in a large pan over medium-high heat.
2. Add garlic and sauté for 30 seconds until fragrant.
3. Add ${ing[0] || 'ingredients'} and cook for 2-3 minutes.
4. Add ${
          ing[1] || 'remaining ingredients'
        } and stir-fry for another 3-5 minutes.
5. Add soy sauce and sesame oil, then season with salt and pepper.
6. Serve hot over rice or noodles.
      `.trim(),
      emoji: '🥘',
    },
    {
      title: (ing: string[]) => `${ing[0] || 'Simple'} Soup`,
      ingredients: (ing: string[]) => [
        ...ing,
        '1 onion, diced',
        '4 cups vegetable or chicken broth',
        '1 tablespoon olive oil',
        'Salt and pepper to taste',
        'Fresh herbs for garnish',
      ],
      instructions: (ing: string[]) =>
        `
1. Heat olive oil in a pot over medium heat.
2. Add diced onion and sauté until translucent.
3. Add ${ing[0] || 'ingredients'} and cook for 2 minutes.
4. Pour in broth and bring to a boil.
5. Reduce heat and simmer for 15-20 minutes.
6. Season with salt and pepper.
7. Garnish with fresh herbs and serve.
      `.trim(),
      emoji: '🍲',
    },
    {
      title: (ing: string[]) => `${ing[0] || 'Fresh'} Salad`,
      ingredients: (ing: string[]) => [
        ...ing,
        'Mixed salad greens',
        '2 tablespoons olive oil',
        '1 tablespoon vinegar or lemon juice',
        '1 teaspoon honey or sugar',
        'Salt and pepper to taste',
      ],
      instructions: (ing: string[]) =>
        `
1. Prepare all ingredients.
2. Combine ${ing.join(', ')} with salad greens in a large bowl.
3. In a small bowl, whisk together olive oil, vinegar, honey, salt and pepper.
4. Pour dressing over ingredients and toss to coat.
5. Serve immediately or chill before serving.
      `.trim(),
      emoji: '🥗',
    },
  ];

  // Generate recipes from templates
  return templates.slice(0, count).map((template, i) => ({
    title: template.title(ingredients),
    ingredients: template.ingredients(ingredients).filter(Boolean),
    instructions: template.instructions(ingredients),
    source: 'fallback',
    imageUrl: '',
  }));
}

async function getRecipeImage(
  recipe: Recipe,
  index: number
): Promise<string> {
  try {
    // Add a retry mechanism
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(
        `Attempt ${attempts} to fetch image for ${recipe.title}`
      );

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/ai-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: recipe.title }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          console.log(
            `Successfully fetched image for ${recipe.title}:`,
            data.imageUrl
          );
          return data.imageUrl;
        }
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // If all attempts fail, use a completely different approach for the fallback image
    console.warn(
      `Failed to fetch image for ${recipe.title} after ${maxAttempts} attempts`
    );

    // Try a fetch to validate the default image exists
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const defaultPath = '/defaultRecipeImage.jpg';
      const testResponse = await fetch(`${baseUrl}${defaultPath}`, {
        method: 'HEAD',
      });

      console.log(
        `Default image test response: ${testResponse.status}`
      );

      if (testResponse.ok) {
        console.log('Default image confirmed accessible');
        return defaultPath;
      } else {
        console.error(
          `Default image not found (status: ${testResponse.status})`
        );
        // Fall back to an external image
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';
      }
    } catch (testError) {
      console.error('Error testing default image:', testError);
      // Fall back to an external image
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';
    }
  } catch (error) {
    console.error(
      `Error in getRecipeImage for ${recipe.title}:`,
      error
    );
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';
  }
}

// Helper function to extract food terms from recipe title
function extractFoodTerms(title: string): string[] {
  // Lowercase the title for better matching
  const lowerTitle = title.toLowerCase();

  // List of common food terms to ignore (not visually distinctive)
  const commonTerms = [
    'quick',
    'easy',
    'simple',
    'homemade',
    'classic',
    'fresh',
    'healthy',
    'delicious',
    'recipe',
    'style',
    'flavored',
    'seasoned',
    'spicy',
    'dish',
  ];

  // Extract words from title, filtering out common terms and short words
  return lowerTitle
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z]/g, '')) // Remove non-alphabetic characters
    .filter((word) => word.length > 3 && !commonTerms.includes(word));
}

// Update this function to fix the TypeScript errors:

// Function to get recipe image from Spoonacular API
async function getSpoonacularImage(
  recipeTitle: string,
  index: number = 0
): Promise<string> {
  try {
    console.log(`Fetching Spoonacular image for: ${recipeTitle}`);

    // Clean up the title for better search results
    const cleanTitle = recipeTitle
      .replace(/\(.*?\)/g, '') // Remove text in parentheses
      .trim();

    // Make API request to Spoonacular
    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
        cleanTitle
      )}&number=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
    );

    if (!response.ok) {
      console.error('Spoonacular API error:', response.status);
      throw new Error(`Spoonacular API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      'Spoonacular response:',
      data.results ? 'Got results' : 'No results'
    );

    if (data.results && data.results.length > 0) {
      // Return the image URL from the first result
      return data.results[0].image;
    }

    // Fall back to Unsplash if no results
    throw new Error('No recipe images found');
  } catch (error) {
    console.error('Error fetching from Spoonacular:', error);

    // Fix the error by creating a proper Recipe object
    // and passing the correct arguments to getRecipeImage
    const recipeObj: Recipe = {
      title: recipeTitle,
      ingredients: [],
      instructions: '',
      source: 'fallback',
      imageUrl: '',
    };

    // Call getRecipeImage with proper parameters,
    return getRecipeImage(recipeObj, index);
  }
}
