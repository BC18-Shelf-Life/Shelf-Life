import { SpoonacularResponse } from '@/app/types/spoonacular-types';
import { getRecipeSearchQuery } from '@/app/utils/recipe-helpers';

// Request throttling mechanism
const requestQueue: Array<() => Promise<any>> = [];
let isProcessing = false;
let quotaExceeded = false; // Use a local variable instead of global

async function throttledRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    processQueue();
  });
}

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  const request = requestQueue.shift();

  try {
    await request!();
  } catch (error) {
    console.error('Error processing request:', error);
  }

  // Wait 350ms between requests (staying under 1 request per second for free tier)
  await new Promise((resolve) => setTimeout(resolve, 350));
  isProcessing = false;
  processQueue();
}

export async function getRecipeImage(query: string): Promise<string> {
  return throttledRequest(async () => {
    try {
      const searchQuery = getRecipeSearchQuery(query);
      console.log('Search query for Spoonacular:', searchQuery);

      if (quotaExceeded) {
        // Use local variable instead
        console.log(
          'Skipping Spoonacular API call - quota already exceeded'
        );
        return '/defaultRecipeImage.jpg'; // Correct path to default image
      }

      const response = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
          searchQuery
        )}&number=3&apiKey=${process.env.SPOONACULAR_API_KEY}`
      );

      // Handle quota exceeded
      if (response.status === 402) {
        console.log('API quota exceeded, using default image');
        quotaExceeded = true; // Set local variable instead
        return '/defaultRecipeImage.jpg'; // Correct path to default image
      }

      if (!response.ok) {
        throw new Error(`Spoonacular API error: ${response.status}`);
      }

      const data: SpoonacularResponse = await response.json();

      if (!data.results?.length) {
        // Try a simpler query if no results
        console.log('No results found, trying simplified query');
        const simpleQuery = query.split(' ')[0]; // Just use first word

        const fallbackResponse = await fetch(
          `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
            simpleQuery
          )}&number=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.results?.length) {
            const fallbackImage = fallbackData.results[0].image;
            return fallbackImage.startsWith('http')
              ? fallbackImage
              : `https://spoonacular.com/recipeImages/${fallbackImage}`;
          }
        }

        console.log('No results found for:', searchQuery);
        return '/defaultRecipeImage.jpg';
      }

      const image = data.results[0].image;
      console.log('Found image from Spoonacular:', image);

      return image.startsWith('http')
        ? image
        : `https://spoonacular.com/recipeImages/${image}`;
    } catch (error) {
      console.error('Error fetching from Spoonacular:', error);
      return '/defaultRecipeImage.jpg';
    }
  });
}
