// apps/api/src/lib/leetcode.ts

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface LeetCodeSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  lang: string;
  statusDisplay: string;
}

export interface LeetCodeProblemMeta {
  titleSlug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topicTags: string[];
  contentSnippet: string;
}

/**
 * Executes a LeetCode GraphQL request.
 */
async function leetcodeQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
      Origin: "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "LeetCode GraphQL error");
  }
  if (!json.data) {
    throw new Error("Empty LeetCode response");
  }
  return json.data;
}

/**
 * Verifies that a LeetCode username exists.
 */
export async function verifyLeetCodeUser(
  username: string,
): Promise<boolean> {
  const data = await leetcodeQuery<{
    matchedUser: { username: string } | null;
  }>(
    `query userExists($username: String!) {
      matchedUser(username: $username) { username }
    }`,
    { username },
  );
  return data.matchedUser !== null;
}

/**
 * Fetches recent accepted submissions for a public profile.
 */
export async function fetchRecentAcSubmissions(
  username: string,
  limit = 2000,
): Promise<LeetCodeSubmission[]> {
  const data = await leetcodeQuery<{
    recentAcSubmissionList: LeetCodeSubmission[];
  }>(
    `query recentAc($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        lang
        statusDisplay
      }
    }`,
    { username, limit },
  );
  return data.recentAcSubmissionList ?? [];
}

/**
 * Builds a slug → metadata map from LeetCode's public problem set.
 */
export async function fetchProblemCatalog(): Promise<
  Map<string, LeetCodeProblemMeta>
> {
  const catalog = new Map<string, LeetCodeProblemMeta>();
  const limit = 100;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await leetcodeQuery<{
      problemsetQuestionList: {
        questions: Array<{
          titleSlug: string;
          title: string;
          difficulty: string;
          topicTags: Array<{ name: string }>;
        }>;
        hasMore: boolean;
      };
    }>(
      `query problemList($limit: Int!, $skip: Int!) {
        problemsetQuestionList: problemsetQuestionListV2(
          categorySlug: ""
          limit: $limit
          skip: $skip
        ) {
          hasMore
          questions {
            titleSlug
            title
            difficulty
            topicTags { name }
          }
        }
      }`,
      { limit, skip },
    );

    const batch = data.problemsetQuestionList.questions;
    for (const question of batch) {
      catalog.set(question.titleSlug, {
        titleSlug: question.titleSlug,
        title: question.title,
        difficulty: question.difficulty as LeetCodeProblemMeta["difficulty"],
        topicTags: question.topicTags.map((tag) => tag.name),
        contentSnippet: question.topicTags.map((tag) => tag.name).join(", "),
      });
    }

    hasMore = data.problemsetQuestionList.hasMore;
    skip += limit;
    if (skip > 5000) break;
  }

  return catalog;
}

/**
 * Fetches a short plain-text description for clustering display.
 */
export async function fetchProblemDescription(
  titleSlug: string,
): Promise<string> {
  try {
    const data = await leetcodeQuery<{
      question: { content: string; topicTags: Array<{ name: string }> } | null;
    }>(
      `query questionContent($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          content
          topicTags { name }
        }
      }`,
      { titleSlug },
    );
    if (!data.question?.content) {
      return data.question?.topicTags.map((tag) => tag.name).join(", ") ?? "";
    }
    return stripHtml(data.question.content).slice(0, 400);
  } catch {
    return "";
  }
}

/**
 * Groups submissions by problem slug with attempt counts.
 */
export function aggregateSubmissions(
  submissions: LeetCodeSubmission[],
): Map<
  string,
  { title: string; titleSlug: string; attempts: number; latestTs: number; lang: string }
> {
  const map = new Map<
    string,
    { title: string; titleSlug: string; attempts: number; latestTs: number; lang: string }
  >();

  for (const submission of submissions) {
    const existing = map.get(submission.titleSlug);
    const timestamp = Number(submission.timestamp) * 1000;
    if (existing) {
      existing.attempts += 1;
      if (timestamp > existing.latestTs) {
        existing.latestTs = timestamp;
        existing.lang = submission.lang;
      }
    } else {
      map.set(submission.titleSlug, {
        title: submission.title,
        titleSlug: submission.titleSlug,
        attempts: 1,
        latestTs: timestamp,
        lang: submission.lang,
      });
    }
  }

  return map;
}

/**
 * Picks a topic cluster label from tags or title keywords.
 */
export function resolveTopicCluster(
  title: string,
  topicTags: string[],
): { cluster: string; summary: string } {
  if (topicTags.length > 0) {
    return {
      cluster: topicTags[0] ?? "General",
      summary: topicTags.join(" · "),
    };
  }

  const lower = title.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/tree|graph|bfs|dfs|node/, "Graphs & Trees"],
    [/dp|dynamic|subsequence|partition/, "Dynamic Programming"],
    [/sort|search|binary/, "Sorting & Searching"],
    [/string|substring|palindrome/, "Strings"],
    [/array|matrix|grid/, "Arrays & Matrices"],
    [/heap|priority|queue/, "Heaps & Queues"],
    [/linked|list/, "Linked Lists"],
    [/math|prime|gcd/, "Math"],
    [/greedy/, "Greedy"],
    [/backtrack/, "Backtracking"],
    [/bit/, "Bit Manipulation"],
  ];

  for (const [pattern, cluster] of rules) {
    if (pattern.test(lower)) {
      return { cluster, summary: `Inferred pattern: ${cluster}` };
    }
  }

  return { cluster: "General DSA", summary: "Mixed concepts" };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
