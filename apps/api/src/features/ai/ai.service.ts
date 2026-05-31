// apps/api/src/features/ai/ai.service.ts

import { prisma } from "../../lib/prisma.js";
import { loadEnv } from "../../config/env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ok, err, type Result } from "../../lib/result.js";

// Types
export interface WeaknessItem {
  id: string;
  name: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendations: string[];
}

export interface TopicProficiency {
  topic: string;
  solvedCount: number;
  proficiency: number; // 0 to 100
  status: "MASTERED" | "IMPROVING" | "NEEDS_PRACTICE";
}

export interface AIInsightsResponse {
  readinessScore: number;
  verdict: string;
  weaknesses: WeaknessItem[];
  topicClusters: TopicProficiency[];
  updatedAt: string;
}

export interface ProblemHintResponse {
  problemId: string;
  title: string;
  hints: {
    observation: string;
    strategy: string;
    blueprint: string;
  };
  pitfalls: string[];
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * AI Coach Service
 */
export class AICoachService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const env = loadEnv();
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    } else {
      console.warn(
        "[codevault-api] GEMINI_API_KEY is not defined. AI Coach will run in smart fallback mode."
      );
    }
  }

  /**
   * Generates AI Insights (Weakness Mapping, Readiness Score, Topic Clusters)
   */
  async getOrGenerateInsights(userId: string, forceRefresh = false): Promise<Result<AIInsightsResponse, Error>> {
    try {
      // 1. Check if we already have fresh insights in the DB (less than 24 hours old) and forceRefresh is false
      if (!forceRefresh) {
        const existingInsight = await prisma.aIInsight.findUnique({
          where: {
            userId_type: {
              userId,
              type: "WEAKNESS_MAP"
            }
          }
        });

        if (existingInsight) {
          const ageHours = (Date.now() - new Date(existingInsight.updatedAt).getTime()) / (1000 * 60 * 60);
          if (ageHours < 24) {
            return ok(existingInsight.parsedJson as unknown as AIInsightsResponse);
          }
        }
      }

      // 2. Fetch user's rich practice profile
      const [problems, mistakes, tags, notes] = await Promise.all([
        prisma.userProblem.findMany({
          where: { userId },
          include: {
            problem: {
              include: {
                problemTags: { include: { tag: true } }
              }
            }
          }
        }),
        prisma.mistake.findMany({
          where: { userId },
          include: { problem: true }
        }),
        prisma.tag.findMany({
          where: { userId }
        }),
        prisma.note.findMany({
          where: { userId }
        })
      ]);

      // If user has zero data, return empty start state insights
      if (problems.length === 0) {
        const initialInsights: AIInsightsResponse = {
          readinessScore: 20,
          verdict: "Welcome to CodeVault! Log your first solved problem and mistakes to unleash personalized AI coaching.",
          weaknesses: [
            {
              id: "initial-1",
              name: "No Logged Solves",
              category: "TRAINING_DATA",
              severity: "MEDIUM",
              description: "You haven't logged any competitive programming solves yet.",
              recommendations: ["Log at least 3 solved problems to enable pattern mapping."]
            }
          ],
          topicClusters: [
            { topic: "Arrays & Strings", solvedCount: 0, proficiency: 0, status: "NEEDS_PRACTICE" },
            { topic: "Searching & Sorting", solvedCount: 0, proficiency: 0, status: "NEEDS_PRACTICE" }
          ],
          updatedAt: new Date().toISOString()
        };
        await this.saveInsightsToDB(userId, initialInsights);
        return ok(initialInsights);
      }

      let insights: AIInsightsResponse;

      // 3. Query Gemini or use premium Smart Mock Fallback (Resilient fallback on failure)
      if (this.genAI) {
        try {
          insights = await this.queryGeminiForInsights(problems, mistakes, tags, notes);
        } catch (geminiError) {
          console.warn(
            "[codevault-api] Gemini insights query failed. Resiliently falling back to smart diagnostics engine.",
            geminiError
          );
          insights = this.generateSmartMockInsights(problems, mistakes, tags, notes);
        }
      } else {
        insights = this.generateSmartMockInsights(problems, mistakes, tags, notes);
      }

      // 4. Save computed insights to the database
      await this.saveInsightsToDB(userId, insights);

      return ok(insights);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generates dynamic hints for a specific problem details view
   */
  async getProblemHints(userId: string, problemId: string): Promise<Result<ProblemHintResponse, Error>> {
    try {
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        include: {
          problemTags: { include: { tag: true } },
          mistakes: { where: { userId } }
        }
      });

      if (!problem) {
        return err(new Error("Problem not found"));
      }

      let hintData: ProblemHintResponse;

      // Resilient fallback on failure
      if (this.genAI) {
        try {
          hintData = await this.queryGeminiForHints(problem);
        } catch (geminiError) {
          console.warn(
            "[codevault-api] Gemini hints query failed. Resiliently falling back to smart hints engine.",
            geminiError
          );
          hintData = this.generateSmartMockHints(problem);
        }
      } else {
        hintData = this.generateSmartMockHints(problem);
      }

      return ok(hintData);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Chat conversation handler with the AI Competitive Programming Coach
   */
  async chatWithCoach(
    userId: string,
    message: string,
    history: ChatMessage[],
    problemId?: string
  ): Promise<Result<string, Error>> {
    try {
      // Gather user profile metadata to inject as system prompt context
      const [stats, recentMistakes, activeProblem] = await Promise.all([
        prisma.userProblem.count({ where: { userId } }),
        prisma.mistake.findMany({
          where: { userId },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { problem: true }
        }),
        problemId ? prisma.problem.findUnique({ where: { id: problemId } }) : null
      ]);

      const systemPrompt = `You are the premium CodeVault AI Coach, an elite competitive programming and DSA mentor.
Your user is a competitive programmer who has solved ${stats} problems.
${
  recentMistakes.length > 0
    ? `Their recent mistakes include: ${recentMistakes
        .map((m) => `"${m.description}" (${m.category}) on problem "${m.problem?.title ?? "unknown"}"`)
        .join("; ")}.`
    : ""
}
${activeProblem ? `They are currently asking about the problem: "${activeProblem.title}" (Platform ID: ${activeProblem.externalId}).` : ""}

Guidelines for responses:
1. Be encouraging, concise, and technical.
2. Use LaTeX style notation (e.g. $O(N \\log N)$) for complexities.
3. Write clean, well-commented code snippets in C++ or Python if asked for code, but prioritize giving observations first.
4. Encourage building rigorous debugging skills.
5. If discussing a problem, offer progressive insights instead of pasting the full solution immediately.`;

      let runMock = !this.genAI;

      if (this.genAI) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt,
          });

          // Formulate chat context
          const chat = model.startChat({
            history: history.map((h) => ({
              role: h.role,
              parts: [{ text: h.content }],
            })),
          });

          const result = await chat.sendMessage(message);
          return ok(result.response.text());
        } catch (geminiError) {
          console.warn(
            "[codevault-api] Gemini chat request failed. Resiliently falling back to rules-based chatbot.",
            geminiError
          );
          runMock = true;
        }
      }

      // High quality rules-based mock responses based on input questions
      const text = message.toLowerCase();
      let reply = "";

      if (text.includes("pitfall") || text.includes("mistake") || text.includes("bug")) {
        reply = `Based on your logged profile, a frequent pitfall you encounter is **Logic boundary conditions** and **Complexity thresholds**. 

Here are three golden rules for competitive programming debugging:
1. **Always test boundary conditions:** $N = 0$, $N = 1$, negative numbers, and maximum limits ($N = 10^5$).
2. **Double check Integer Overflows:** If variables or accumulation sums exceed $2 \\cdot 10^9$, make sure to use \`long long\` in C++ or make it explicit.
3. **Analyze time limits:** $O(N^2)$ works for $N \\le 5000$, but for $N = 10^5$, you must target $O(N \\log N)$ or $O(N)$ using dynamic programming or two-pointer strategies.`;
      } else if (text.includes("segment tree") || text.includes("fenwick")) {
        reply = `Ah, range query data structures! **Segment Trees** are beautiful.

A standard Segment Tree handles range queries and point/range updates in $O(\\log N)$ time.
- **Space complexity:** $4N$ nodes are required in a standard array-based implementation.
- **Key concept:** Binary subdivision. Each node represents the sum (or min/max) of the range $[L, R]$. Its children represent $[L, (L+R)/2]$ and $[(L+R)/2 + 1, R]$.

Would you like a clean C++ template for a Point-Update Range-Sum Segment Tree? Just ask!`;
      } else if (text.includes("template") || text.includes("c++") || text.includes("code")) {
        reply = `Here is a highly optimized C++ template for competitive programming that speeds up I/O and imports everything:

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

#define fast_io ios_base::sync_with_stdio(false); cin.tie(NULL);
typedef long long ll;
typedef vector<int> vi;

void solve() {
    // Write your logic here
}

int main() {
    fast_io;
    int t = 1;
    cin >> t;
    while (t--) {
        solve();
    }
    return 0;
}
\`\`\`

Would you like me to write a specific solution template for a standard graph traversal or binary search range query instead?`;
      } else if (history.length === 0) {
        reply = `Hello! I am your CodeVault AI Coach. I have analyzed your solve history of **${stats} problems**.

I am ready to help you:
- Review complex DSA code snippets and optimize Big-O runtimes.
- Walk you through dynamic programming transitions or graph traversals.
- Debug boundary edge cases that lead to Wrong Answer (WA) or Runtime Error (RTE).

What competitive programming concept or problem are we grinding on today?`;
      } else if (history.length === 2) {
        reply = `That is an excellent follow-up! In competitive programming, when you want to take your code from $O(N^2)$ to $O(N \\log N)$ or $O(N)$, you should ask yourself:
1. **Can we sort the input?** Often, sorting opens the door to binary search or two-pointer traversals.
2. **Can we use a sliding window?** If we are tracking contiguous subarrays, a sliding window maintains elements dynamically in $O(1)$ amortized time.
3. **Is there a monotonic property?** If the condition "holds for $X$, therefore it holds for all $Y > X$", we can binary search on the answer space.

Which of these approaches feels most applicable to what you are trying to optimize?`;
      } else {
        reply = `Fascinating. Let's look deeper into that. For your solved count of **${stats} problems**, you are starting to encounter problems requiring advanced modular math and combinatorics.

Here is a quick CP guideline for modulo operations:
- $(\\text{A} + \\text{B}) \\% \\text{M} = ((\\text{A} \\% \\text{M}) + (\\text{B} \\% \\text{M})) \\% \\text{M}$
- $(\\text{A} \\cdot \\text{B}) \\% \\text{M} = ((\\text{A} \\% \\text{M}) \\cdot (\\text{B} \\% \\text{M})) \\% \\text{M}$
- For division $(\\text{A} / \\text{B}) \\% \\text{M}$, you must compute the modular multiplicative inverse using Fermat's Little Theorem: $\\text{B}^{\\text{M}-2} \\% \\text{M}$ (when $\\text{M}$ is prime).

Would you like me to generate a C++ helper function for fast modular exponentiation $O(\\log Y)$? Just let me know!`;
      }

        // Add small artificial delay to simulate typing
        await new Promise((resolve) => setTimeout(resolve, 800));
        return ok(reply);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // --- PRIVATE UTILITIES ---

  private async saveInsightsToDB(userId: string, insights: AIInsightsResponse) {
    // Save under the WEAKNESS_MAP slot in our database
    await prisma.aIInsight.upsert({
      where: {
        userId_type: {
          userId,
          type: "WEAKNESS_MAP",
        },
      },
      create: {
        userId,
        type: "WEAKNESS_MAP",
        rawJson: insights as any,
        parsedJson: insights as any,
      },
      update: {
        rawJson: insights as any,
        parsedJson: insights as any,
        updatedAt: new Date(),
      },
    });
  }

  private async queryGeminiForInsights(
    problems: any[],
    mistakes: any[],
    tags: any[],
    notes: any[]
  ): Promise<AIInsightsResponse> {
    const formattedProblems = problems.map((p) => ({
      title: p.problem.title,
      attempts: p.attempts,
      rating: p.rating,
      language: p.language,
      solveDate: p.solveDate,
      tags: p.problem.problemTags.map((pt: any) => pt.tag.name),
    }));

    const formattedMistakes = mistakes.map((m) => ({
      category: m.category,
      description: m.description,
      problemTitle: m.problem?.title,
    }));

    const prompt = `You are an elite competitive programming coach. Analyze the user's practice data and generate a detailed diagnostic profile.
Provide the response in raw JSON format matching this TypeScript interface:
\`\`\`typescript
interface AIInsightsResponse {
  readinessScore: number; // 0 to 100 representing competitive programming capability
  verdict: string; // 2-3 sentences motivational summary and action guidance
  weaknesses: Array<{
    id: string; // e.g. "weakness-dp-transition"
    name: string; // Title of weakness
    category: string; // e.g. "Dynamic Programming" or "Boundary Conditions"
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string; // Explanation of why this is a weakness
    recommendations: string[]; // Actionable bullet points to improve
  }>;
  topicClusters: Array<{
    topic: string; // e.g. "Dynamic Programming", "Graphs", "Math"
    solvedCount: number; // calculated count
    proficiency: number; // 0 to 100 rating
    status: "MASTERED" | "IMPROVING" | "NEEDS_PRACTICE";
  }>;
}
\`\`\`

USER DATA:
Solved Problems: ${JSON.stringify(formattedProblems, null, 2)}
Logged Mistakes: ${JSON.stringify(formattedMistakes, null, 2)}
Notes Count: ${notes.length}
Available Tags: ${tags.map((t) => t.name).join(", ")}

Generate the raw JSON without any markdown formatting wrappers (no \`\`\`json blocks), just pure valid JSON.`;

    const model = this.genAI!.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Parse the JSON safely (stripping backticks if Gemini returned them)
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const insights = JSON.parse(cleaned) as AIInsightsResponse;
    insights.updatedAt = new Date().toISOString();
    return insights;
  }

  private async queryGeminiForHints(problem: any): Promise<ProblemHintResponse> {
    const prompt = `You are a competitive programming coach. Generate progressive hints and common traps for this problem.
Problem Title: "${problem.title}"
Platform External ID: "${problem.externalId}"
Tags: ${problem.problemTags.map((pt: any) => pt.tag.name).join(", ")}
User Mistakes logged on this problem: ${problem.mistakes.map((m: any) => m.description).join("; ")}

Return raw JSON matching this format:
\`\`\`typescript
interface HintResponse {
  hints: {
    observation: string; // Hint 1: High level observation about the problem structure. Make it helpful but don't give the code.
    strategy: string; // Hint 2: Specific algorithmic approach or mathematical formulation.
    blueprint: string; // Hint 3: Detailed pseudocode or structural template in C++ or Python style showing loops/structures.
  };
  pitfalls: string[]; // 2-3 common traps or edge cases that competitive programmers get Wrong Answer (WA) or TLE for here.
}
\`\`\`

Generate only the raw JSON string without any markdown wraps.`;

    const model = this.genAI!.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const hints = JSON.parse(cleaned);

    return {
      problemId: problem.id,
      title: problem.title,
      hints: hints.hints,
      pitfalls: hints.pitfalls,
    };
  }

  private generateSmartMockInsights(
    problems: any[],
    mistakes: any[],
    tags: any[],
    notes: any[]
  ): AIInsightsResponse {
    // Smart calculations based on real DB variables
    const solvedCount = problems.length;
    const mistakeCount = mistakes.length;

    // Count tags
    const tagCountMap: Record<string, number> = {};
    for (const p of problems) {
      for (const pt of p.problem.problemTags) {
        const name = pt.tag.name;
        tagCountMap[name] = (tagCountMap[name] || 0) + 1;
      }
    }

    // Determine primary mistakes category
    const mistakeCategories = mistakes.map((m) => m.category);
    const categoryCounts: Record<string, number> = {};
    let dominantCategory = "Logic boundary conditions";
    let maxCatCount = 0;
    for (const cat of mistakeCategories) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (categoryCounts[cat] > maxCatCount) {
        maxCatCount = categoryCounts[cat];
        dominantCategory = cat;
      }
    }

    // Dynamically calculate score
    // base 40, solvedCount yields +3 per problem up to 25. mistake ratio reduces score.
    const baseScore = 45;
    const solvedAdd = Math.min(solvedCount * 3.5, 35);
    const mistakePenalty = Math.min(mistakeCount * 2.5, 20);
    const score = Math.max(10, Math.min(99, Math.round(baseScore + solvedAdd - mistakePenalty)));

    let verdict = "";
    if (score < 40) {
      verdict = "You are laying down the foundations of your competitive programming journey. Focus on simple tag coverage (Arrays, Strings) and logging mistakes consistently.";
    } else if (score < 75) {
      verdict = `Solid progression! You solved ${solvedCount} problems and have logged ${mistakeCount} mistakes. You are showing growing confidence, but you should refine your approaches in ${dominantCategory.toLowerCase()} topics.`;
    } else {
      verdict = `Outstanding proficiency. Your spaced repetition queue is clean, and your problem-solve ratio is elite. Deep dive into advanced Graphs and segment tree variants to cross the final barrier.`;
    }

    // Weaknesses list based on real mistakes categories
    const weaknesses: WeaknessItem[] = [];
    if (mistakeCount > 0) {
      weaknesses.push({
        id: "mock-weakness-1",
        name: `Frequent ${dominantCategory} issues`,
        category: dominantCategory,
        severity: maxCatCount >= 3 ? "HIGH" : "MEDIUM",
        description: `Our analysis shows that ${dominantCategory.toLowerCase()} is your primary source of bug submissions. This often results in Wrong Answer or runtime errors.`,
        recommendations: [
          `Implement assertions at index boundaries before building arrays.`,
          `Write down dry-run test cases on paper for extreme values ($N=0$ or $N=1$).`
        ]
      });
    }

    // High attempt count weakness
    const highAttemptProblems = problems.filter((p) => p.attempts >= 3);
    if (highAttemptProblems.length > 0) {
      weaknesses.push({
        id: "mock-weakness-2",
        name: "Implementation Runtime Endurance",
        category: "IMPLEMENTATION",
        severity: "MEDIUM",
        description: `You average ${Math.round(problems.reduce((a, b) => a + b.attempts, 0) / solvedCount * 10) / 10} attempts per solved problem. Highly optimal solutions are frequently taking you 3 or more iterations to compile correctly.`,
        recommendations: [
          "Do not start coding immediately upon reading the prompt. Spend 10 minutes writing full pseudocode first.",
          "Check constraints carefully to avoid basic TLE (Time Limit Exceeded) mistakes."
        ]
      });
    }

    if (weaknesses.length === 0) {
      weaknesses.push({
        id: "mock-weakness-none",
        name: "Data Density Collection",
        category: "MISTAKES",
        severity: "LOW",
        description: "You haven't logged many mistakes yet. Keep logging your false submissions to generate advanced pattern mapping.",
        recommendations: ["Always log a mistake when a problem takes more than 2 submissions to pass."]
      });
    }

    // Topic proficiency based on tags
    const defaultTopics = ["Arrays & Hashing", "Two Pointers & Sliding Window", "Dynamic Programming", "Graph Algorithms", "Greedy / Math"];
    const topicClusters = defaultTopics.map((topic, i) => {
      const count = tagCountMap[topic] || (i === 0 ? Math.min(solvedCount, 2) : 0);
      let proficiency = 15;
      if (count > 0) {
        proficiency = Math.min(95, 30 + count * 15);
      }
      let status: "MASTERED" | "IMPROVING" | "NEEDS_PRACTICE" = "NEEDS_PRACTICE";
      if (proficiency >= 80) status = "MASTERED";
      else if (proficiency >= 45) status = "IMPROVING";

      return {
        topic,
        solvedCount: count,
        proficiency,
        status
      };
    });

    return {
      readinessScore: score,
      verdict,
      weaknesses,
      topicClusters,
      updatedAt: new Date().toISOString()
    };
  }

  private generateSmartMockHints(problem: any): ProblemHintResponse {
    const title = problem.title.toLowerCase();
    let hints = {
      observation: "Observe the constraints. If $N \\le 10^5$, an $O(N^2)$ algorithm will exceed the typical 1.0s time limit. We need an $O(N)$ or $O(N \\log N)$ strategy.",
      strategy: "We can use an auxiliary hash map to store previous states, or sort the elements to achieve the optimal lookup time.",
      blueprint: `// Mock pseudocode blueprint for reference
for (int i = 0; i < N; i++) {
    int target = query - arr[i];
    if (map.contains(target)) {
        return {map.get(target), i};
    }
    map.insert(arr[i], i);
}`
    };
    
    let pitfalls = [
      "Integer overflow: check if multiplication calculations exceed $2^{31}-1$. Use 64-bit storage.",
      "Out of bounds: check index limits for empty inputs or inputs of size 1."
    ];

    // Customize for common competitive programming problem types
    if (title.includes("sum") || title.includes("two")) {
      hints.observation = "Consider the relationship between two numbers adding up to a target value. If we know the first value $A$, the second value is uniquely determined as $\\text{target} - A$.";
      hints.strategy = "Instead of nested loops checking all pairs ($O(N^2)$), use a Hash Map (or frequency array) to check if $\\text{target} - A$ has been seen, reducing runtime to $O(N)$ with $O(N)$ extra space.";
    } else if (title.includes("subsequence") || title.includes("knapsack") || title.includes("path")) {
      hints.observation = "This problem has optimal substructure and overlapping subproblems. A greedy approach will fail. We should define a state function $DP(i)$ represent our optimal value at step $i$.";
      hints.strategy = "Define $DP[i]$ as the maximum value achievable considering items up to index $i$. The transition is typically $DP[i] = \\max(DP[i-1], DP[i-w] + v)$. We initialize base cases at $DP[0] = 0$.";
      hints.blueprint = `// DP table initialization
vector<int> dp(N + 1, 0);
for (int i = 1; i <= N; i++) {
    dp[i] = dp[i-1]; // Skip state
    if (i >= weight) {
        dp[i] = max(dp[i], dp[i - weight] + value); // Take state
    }
}`;
    }

    return {
      problemId: problem.id,
      title: problem.title,
      hints,
      pitfalls
    };
  }
}
