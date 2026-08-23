"use server";

import { db } from "@/lib/prisma";
import { generateGeminiContent } from "@/lib/gemini";
import { requireUserId } from "@/lib/require-auth";

export async function generateQuiz() {
  const userId = await requireUserId();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const result = await generateGeminiContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("Gemini returned no questions");
    }

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz, using fallback:", error.message);
    return buildFallbackQuiz(user.industry, user.skills);
  }
}

function buildFallbackQuiz(industry, skills = []) {
  const field = (industry || "your field").replace(/-/g, " ");
  const skill = skills?.[0] || "Python";

  return [
    {
      question: `A startup in ${field} asks how you would evaluate a new investment. What is the best first step?`,
      options: [
        "Write a full legal contract immediately",
        "Build a simple thesis from market, team, product, and traction",
        "Invest based only on the founder's charisma",
        "Copy a competitor's latest press release",
      ],
      correctAnswer:
        "Build a simple thesis from market, team, product, and traction",
      explanation:
        "A clear investment thesis keeps diligence focused on evidence instead of hype.",
    },
    {
      question: `Which ${skill} practice is most useful when analyzing messy startup metrics?`,
      options: [
        "Hard-coding numbers into slides",
        "Cleaning the data, then calculating growth and retention",
        "Deleting outliers without checking them",
        "Using only one month of revenue",
      ],
      correctAnswer:
        "Cleaning the data, then calculating growth and retention",
      explanation:
        "Clean inputs and cohort-style metrics show whether growth is real and repeatable.",
    },
    {
      question: "What does a cap table primarily show?",
      options: [
        "The company's office lease terms",
        "Who owns equity and how ownership changes with new funding",
        "Daily website traffic",
        "Employee vacation balances",
      ],
      correctAnswer:
        "Who owns equity and how ownership changes with new funding",
      explanation:
        "Investors use the cap table to understand dilution, control, and payout order.",
    },
    {
      question: "In a pitch meeting, which question best tests product-market fit?",
      options: [
        "What color is the logo?",
        "Why do customers buy, stay, and refer others?",
        "How many fonts does the website use?",
        "Where was the company incorporated?",
      ],
      correctAnswer: "Why do customers buy, stay, and refer others?",
      explanation:
        "Retention and referrals are stronger fit signals than vanity metrics.",
    },
    {
      question: "Which statement about term sheets is true?",
      options: [
        "They are only used after an IPO",
        "They outline key deal terms before final legal documents",
        "They replace the need for diligence",
        "They always guarantee a closed round",
      ],
      correctAnswer:
        "They outline key deal terms before final legal documents",
      explanation:
        "A term sheet is a negotiation map, not a completed investment.",
    },
    {
      question: "A founder reports 40% month-over-month growth. What should you check next?",
      options: [
        "Whether growth is from paid ads, one customer, or durable demand",
        "Only the social media follower count",
        "The office snack budget",
        "The founder's undergraduate GPA",
      ],
      correctAnswer:
        "Whether growth is from paid ads, one customer, or durable demand",
      explanation:
        "Quality of growth matters more than a single headline percentage.",
    },
    {
      question: `How can ${skill} help during diligence in ${field}?`,
      options: [
        "It can only generate marketing copy",
        "It can model scenarios, clean datasets, and test assumptions quickly",
        "It replaces the need to talk to customers",
        "It automatically approves investments",
      ],
      correctAnswer:
        "It can model scenarios, clean datasets, and test assumptions quickly",
      explanation:
        "Technical skills speed analysis, but they still need human judgment.",
    },
    {
      question: "What is a common red flag in early-stage startups?",
      options: [
        "A small but loyal customer base",
        "Revenue that depends on one customer and no clear pipeline",
        "A focused product roadmap",
        "Transparent monthly reporting",
      ],
      correctAnswer:
        "Revenue that depends on one customer and no clear pipeline",
      explanation:
        "Concentration risk can make a round look healthy until that customer leaves.",
    },
    {
      question: "Which follow-up best shows you understood a founder's market?",
      options: [
        "Repeating their slogan word for word",
        "Comparing their wedge, competitors, and why they win now",
        "Asking only about valuation",
        "Changing the subject to an unrelated industry",
      ],
      correctAnswer:
        "Comparing their wedge, competitors, and why they win now",
      explanation:
        "Strong investors test positioning, not just enthusiasm.",
    },
    {
      question: "After a first meeting, what is the most professional next step?",
      options: [
        "Ignore the founder until they follow up twice",
        "Send a short note with interest level, next questions, and timeline",
        "Post confidential metrics on social media",
        "Promise a term sheet with no partner discussion",
      ],
      correctAnswer:
        "Send a short note with interest level, next questions, and timeline",
      explanation:
        "Clear, timely communication protects the relationship and your process.",
    },
  ];
}

export async function saveQuizResult(questions, answers, score) {
  const userId = await requireUserId();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await generateGeminiContent(improvementPrompt);

      improvementTip = tipResult.response.text().trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const userId = await requireUserId();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
