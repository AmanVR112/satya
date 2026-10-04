import prisma from "../lib/prisma";
import {
    ResearchEvidence,
    ResearchResult,
    SourceType,
} from "./research.types";

interface TavilyResult {
    url: string;
    title: string;
    content: string;
    score: number;
    published_date?: string | null;
}

interface TavilyResponse {
    results: TavilyResult[];
}

class ResearchService {
    private readonly tavilyUrl =
        "https://api.tavily.com/search";

    private buildVerificationQuery(claim: string): string {
        return `"${claim}"

Verify this specific factual claim.
Find evidence that directly establishes or contradicts the exact claim.
Prefer primary, official, government, institutional, scientific,
fact-checking, and reputable sources.
Match the exact subject, action, object, location, date,
quantity, condition, and status when those details are present.
Do not substitute related facts for the specific claim.
Ignore unrelated events, entities, dates, or topics.
`;
    }

    async searchClaim(
        claimId: string,
        claim: string
    ): Promise<ResearchResult> {
        const apiKey = process.env.TAVILY_API_KEY;

        if (!apiKey) {
            throw new Error("TAVILY_API_KEY is not configured");
        }

        const verificationQuery = this.buildVerificationQuery(claim);

        console.log("\n=== TAVILY SEARCH ===");
        console.log("Original claim:", claim);
        console.log("Verification query:", verificationQuery);

        const response = await fetch(this.tavilyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query: verificationQuery,
                search_depth: "advanced",
                include_answer: false,
                max_results: 8,
            }),
        });

        if (!response.ok) {
            throw new Error(
                `Tavily request failed with status ${response.status}`
            );
        }

        const data =
            (await response.json()) as TavilyResponse;

        const evidence: ResearchEvidence[] =
            data.results.map((result) => ({
                source: {
                    url: result.url,
                    title: result.title,
                    domain: this.extractDomain(result.url),
                    sourceType: this.detectSourceType(result.url),
                    publishedAt:
                        result.published_date ?? undefined,
                },
                excerpt: result.content,
                relevance: "UNKNOWN",
                directness: "UNKNOWN",
                independence: "UNKNOWN",
            }));

        console.log(
            `Tavily returned ${evidence.length} results`
        );

        evidence.forEach((item, index) => {
            console.log(
                `${index + 1}. ${item.source.title} | ${item.source.domain}`
            );
        });

        await this.saveEvidence(claimId, evidence);

        return {
            claimId,
            evidence,
        };
    }

    private async saveEvidence(
        claimId: string,
        evidence: ResearchEvidence[]
    ): Promise<void> {
        for (const item of evidence) {
            const source = await prisma.source.upsert({
                where: {
                    url: item.source.url,
                },

                update: {
                    title: item.source.title,
                    domain: item.source.domain,
                    sourceType: item.source.sourceType,

                    publishedAt: item.source.publishedAt
                        ? new Date(item.source.publishedAt)
                        : undefined,
                },

                create: {
                    url: item.source.url,
                    title: item.source.title,
                    domain: item.source.domain,
                    sourceType: item.source.sourceType,

                    publishedAt: item.source.publishedAt
                        ? new Date(item.source.publishedAt)
                        : undefined,
                },
            });

            await prisma.evidence.create({
                data: {
                    claimId,
                    sourceId: source.id,
                    excerpt: item.excerpt,
                    relevance: item.relevance,
                    directness: item.directness,
                    independence: item.independence,
                },
            });
        }
    }

    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return "unknown";
        }
    }

    private detectSourceType(url: string): SourceType {
        const domain = this.extractDomain(url)
            .toLowerCase()
            .replace(/^www\./, "");

        // Government / official sources
        if (
            domain.endsWith(".gov.in") ||
            domain.endsWith(".gov") ||
            domain.endsWith(".nic.in") ||
            domain.endsWith(".gov.uk") ||
            domain.endsWith(".gov.au")
        ) {
            return "OFFICIAL";
        }

        // Major news organizations
        const newsDomains = [
            "reuters.com",
            "apnews.com",
            "bbc.com",
            "bbc.co.uk",
            "theguardian.com",
            "nytimes.com",
            "washingtonpost.com",
            "wsj.com",
            "cnn.com",
            "cbsnews.com",
            "nbcnews.com",
            "abcnews.go.com",
            "npr.org",
            "usatoday.com",
            "axios.com",
            "politico.com",
            "aljazeera.com",
            "ndtv.com",
            "thehindu.com",
            "indianexpress.com",
            "hindustantimes.com",
            "timesofindia.indiatimes.com",
            "news18.com",
        ];

        if (
            newsDomains.some(
                (newsDomain) =>
                    domain === newsDomain ||
                    domain.endsWith(`.${newsDomain}`)
            )
        ) {
            return "NEWS";
        }

        // Known fact-checking organizations
        const factCheckDomains = [
            "snopes.com",
            "politifact.com",
            "factcheck.org",
            "fullfact.org",
            "boomlive.in",
            "altnews.in",
            "factly.in",
        ];

        if (
            factCheckDomains.some(
                (factCheckDomain) =>
                    domain === factCheckDomain ||
                    domain.endsWith(`.${factCheckDomain}`)
            )
        ) {
            return "FACT_CHECK";
        }

        return "OTHER";
    }
}

export const researchService =
    new ResearchService();