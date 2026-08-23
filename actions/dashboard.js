"use server";

import { db } from "@/lib/prisma";
import { generateGeminiContent } from "@/lib/gemini";
import { requireUserId } from "@/lib/require-auth";

function fallbackInsights(industry) {
  const label = industry.replace(/-/g, " ");
  return {
    salaryRanges: [
      { role: "Analyst", min: 65000, max: 95000, median: 80000, location: "United States" },
      { role: "Associate", min: 85000, max: 130000, median: 105000, location: "United States" },
      { role: "Senior Associate", min: 110000, max: 170000, median: 140000, location: "United States" },
      { role: "Vice President", min: 150000, max: 230000, median: 185000, location: "United States" },
      { role: "Director", min: 180000, max: 280000, median: 220000, location: "United States" },
    ],
    growthRate: 8.5,
    demandLevel: "High",
    topSkills: ["Financial modeling", "Market research", "Python", "Communication", "Due diligence"],
    marketOutlook: "Positive",
    keyTrends: [
      `Growing demand for specialists in ${label}`,
      "Increased use of data and automation",
      "Remote and hybrid work remains common",
      "Stronger focus on compliance and risk",
      "AI tools are changing day-to-day workflows",
    ],
    recommendedSkills: ["Python", "SQL", "Excel", "Presentation", "Networking"],
  };
}

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  try {
    const result = await generateGeminiContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini insights failed, using fallback:", error.message);
    return fallbackInsights(industry);
  }
};

export async function getIndustryInsights() {
  const userId = await requireUserId();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}
