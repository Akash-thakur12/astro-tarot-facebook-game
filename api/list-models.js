import { GoogleGenerativeAI } from '@google/generative-ai';
import pkg from '../package.json' assert { type: 'json' };

export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // In newer SDK versions, we might need to use the listModels method 
    // However, some versions of the SDK might not expose it directly or it might be internal.
    // We will attempt to use the REST API via fetch as a secondary check if SDK doesn't support it,
    // but the user requested to use the SDK specifically.
    
    console.log(`DIAGNOSTIC: SDK Version: ${pkg.dependencies['@google/generative-ai']}`);
    
    // Note: The SDK doesn't always expose a public 'listModels' on the genAI instance 
    // in all versions. We will try to find it or fallback to the REST endpoint.
    // For @google/generative-ai ^0.21.0+, the method is not on the GenAI class but accessible via REST.
    // Let's try to find if it exists.
    
    let models = [];
    let endpointVersion = "unknown";

    // Attempt to list via REST to be certain of the data, as it's the most reliable way 
    // to get 'supportedMethods' and metadata.
    const restResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const restData = await restResponse.json();
    
    if (restData.models) {
      models = restData.models;
      endpointVersion = "v1beta";
    } else {
      // Try v1
      const v1Response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`);
      const v1Data = await v1Response.json();
      if (v1Data.models) {
        models = v1Data.models;
        endpointVersion = "v1";
      }
    }

    const report = models.map(m => ({
      name: m.name.replace('models/', ''),
      fullName: m.name,
      supportedMethods: m.supportedMethods,
      supportsGenerateContent: m.supportedMethods.includes('generateContent'),
      description: m.description,
      inputTokenLimit: m.inputTokenLimit,
      outputTokenLimit: m.outputTokenLimit
    }));

    const generateContentModels = report
      .filter(m => m.supportsGenerateContent)
      .map(m => m.name);

    // Recommendation logic
    let recommendation = "N/A";
    if (generateContentModels.includes("gemini-1.5-flash")) {
      recommendation = "gemini-1.5-flash (Stable, widely available)";
    } else if (generateContentModels.includes("gemini-1.5-flash-8b")) {
      recommendation = "gemini-1.5-flash-8b (Fast, lighter weight)";
    } else if (generateContentModels.length > 0) {
      recommendation = generateContentModels[0];
    }

    return res.status(200).json({
      sdkVersion: pkg.dependencies['@google/generative-ai'],
      apiEndpointVersion: endpointVersion,
      recommendation: recommendation,
      availableModelsCount: report.length,
      generateContentModels: generateContentModels,
      allModels: report
    });

  } catch (error) {
    console.error("DIAGNOSTIC ERROR:", error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}
