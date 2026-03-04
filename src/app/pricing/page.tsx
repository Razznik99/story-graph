"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { PLANS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(false);

    // Extract from backend PLANS object
    const tiers = [
        {
            name: "Free",
            id: "tier-free",
            href: "#",
            priceMonthly: PLANS.free.monthly_price,
            priceAnnual: PLANS.free.annual_price,
            description: "Everything you need to get started tracking your stories.",
            features: [
                "Up to 5 Stories",
                "1,000 Cards per Story",
                "1,000 Events per Story",
                "500 Image Uploads / mo",
                "Community Support",
            ],
            missingFeatures: [
                "AI Content Generation",
                "AI Image Generation",
                "Real-time Collaboration",
            ],
            mostPopular: false,
        },
        {
            name: "Scribe",
            id: "tier-scribe",
            href: "#",
            priceMonthly: PLANS.scribe.monthly_price,
            priceAnnual: PLANS.scribe.annual_price,
            description: "For dedicated writers who need AI assistance and collaboration.",
            features: [
                "Unlimited Stories",
                "Unlimited Cards & Events",
                "2,000,000 AI Tokens / mo",
                "150 AI Image Generations / mo",
                "1,500 Image Uploads / mo",
                "Up to 3 Collaborators",
            ],
            missingFeatures: [],
            mostPopular: true,
        },
        {
            name: "Author",
            id: "tier-author",
            href: "#",
            priceMonthly: PLANS.author.monthly_price,
            priceAnnual: PLANS.author.annual_price,
            description: "For professional authors collaborating with editors.",
            features: [
                "Unlimited Stories",
                "Unlimited Cards & Events",
                "5,000,000 AI Tokens / mo",
                "500 AI Image Generations / mo",
                "5,000 Image Uploads / mo",
                "Up to 10 Collaborators",
            ],
            missingFeatures: [],
            mostPopular: false,
        },
        {
            name: "Shakespeare",
            id: "tier-shakespeare",
            href: "#",
            priceMonthly: PLANS.shakespeare.monthly_price,
            priceAnnual: PLANS.shakespeare.annual_price,
            description: "The ultimate package for massive world-building teams.",
            features: [
                "Unlimited Stories",
                "Unlimited Cards & Events",
                "10,000,000 AI Tokens / mo",
                "1,000 AI Image Generations / mo",
                "10,000 Image Uploads / mo",
                "Unlimited Collaborators",
            ],
            missingFeatures: [],
            mostPopular: false,
        },
    ];

    return (
        <div className="bg-background py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base/7 font-semibold text-primary">Pricing</h2>
                    <p className="mt-2 text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                        Pricing that scales with your stories
                    </p>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-pretty text-center text-lg font-medium text-muted-foreground sm:text-xl/8">
                    Choose the perfect plan for your world-building needs. Upgrade any time as your journey expands.
                </p>

                <div className="mt-16 flex justify-center">
                    <div className="flex items-center gap-x-4 bg-muted/50 p-1 rounded-full border">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${!isAnnual
                                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all flex items-center gap-2 ${isAnnual
                                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Annually <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary hover:bg-primary/30">Save 20%</Badge>
                        </button>
                    </div>
                </div>

                <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl lg:grid-cols-4 xl:max-w-7xl">
                    {tiers.map((tier) => (
                        <Card
                            key={tier.id}
                            className={`flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${tier.mostPopular ? "border-primary shadow-lg ring-1 ring-primary/50 relative" : ""
                                }`}
                        >
                            {tier.mostPopular && (
                                <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-primary px-3 py-1 text-center text-xs font-medium text-primary-foreground shadow-sm">
                                    Most Popular
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between gap-x-4">
                                    <span className="text-lg font-semibold leading-8">{tier.name}</span>
                                </CardTitle>
                                <CardDescription className="text-sm leading-6">
                                    {tier.description}
                                </CardDescription>
                                <div className="mt-6 flex items-baseline gap-x-1">
                                    <span className="text-4xl font-semibold tracking-tight">
                                        ${isAnnual ? tier.priceAnnual : tier.priceMonthly}
                                    </span>
                                    <span className="text-sm font-semibold leading-6 text-muted-foreground">
                                        /month
                                    </span>
                                </div>
                                {isAnnual && tier.priceMonthly > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Billed ${tier.priceAnnual * 12} yearly
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <ul className="mt-8 space-y-3 text-sm leading-6 sm:mt-10">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex gap-x-3 text-foreground/80">
                                            <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                    {tier.missingFeatures?.map((feature) => (
                                        <li key={feature} className="flex gap-x-3 text-muted-foreground opacity-50">
                                            <X className="h-6 w-5 flex-none" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={tier.mostPopular ? "default" : "outline"}
                                >
                                    {tier.name === "Free" ? "Get Started" : "Subscribe"}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
