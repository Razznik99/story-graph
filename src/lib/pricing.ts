import { PlanType, SubscriptionStatus } from "@prisma/client";

export const PLANS = {
    free: {
        tokens: 0,
        img_gen: 0,
        img_upload: 500, // Monthly uploads
        stories: 5,
        cards_per_story: 1000,
        events_per_story: 1000,
        collaborators: 0,
        monthly_price: 0,
        annual_price: 0,
    },
    scribe: {
        tokens: 2000000,
        img_gen: 150,
        img_upload: 1500,
        stories: null, // Unlimited
        cards_per_story: null,
        events_per_story: null,
        collaborators: 3,
        monthly_price: 7,
        annual_price: 5,
    },
    author: {
        tokens: 5000000,
        img_gen: 500,
        img_upload: 5000,
        stories: null,
        cards_per_story: null,
        events_per_story: null,
        collaborators: 10,
        monthly_price: 13,
        annual_price: 10,
    },
    shakespeare: {
        tokens: 10000000,
        img_gen: 1000,
        img_upload: 10000,
        stories: null,
        cards_per_story: null,
        events_per_story: null,
        collaborators: null, // Unlimited
        monthly_price: 25,
        annual_price: 20,
    },
};

/**
 * Checks if a user can use a basic feature that depends on active subscription state
 * For quantitative limits, use the specific checker functions below.
 */
export function canUseFeature(user: { plan: PlanType; subscriptionStatus: SubscriptionStatus }) {
    if (user.plan === "free") return true; // Free users can use free features

    // If they have a paid plan, their subscription must be active (or trialing/past_due based on how you handle grace periods, but typically active/trialing/past_due means they haven't been canceled yet)
    // Standard implementation as suggested ensures we don't downgrade immediately on payment_failed, so 'past_due' is still considered active access until canceled.
    if (user.subscriptionStatus === "canceled") return false;

    return true;
}

/**
 * Returns the effective plan limits for a given user based on their plan and subscription status.
 * If a user's subscription is canceled but their plan is marked as a paid tier, it defaults to the 'free' tier limits.
 */
export function getUserPlanLimits(user: { plan: PlanType; subscriptionStatus: SubscriptionStatus }) {
    if (user.plan !== "free" && user.subscriptionStatus === "canceled") {
        // If they have a paid plan in the DB but the subscription is canceled, enforce Free limits.
        return PLANS.free;
    }
    return PLANS[user.plan];
}

/**
 * Checks if a user is allowed to create another story.
 */
export function canCreateStory(
    user: { plan: PlanType; subscriptionStatus: SubscriptionStatus },
    currentStoryCount: number
): boolean {
    const limits = getUserPlanLimits(user);
    if (limits.stories === null) return true; // Unlimited
    return currentStoryCount < limits.stories;
}

/**
 * Checks if a user is allowed to create another card in a story.
 */
export function canCreateCard(
    user: { plan: PlanType; subscriptionStatus: SubscriptionStatus },
    currentCardCount: number
): boolean {
    const limits = getUserPlanLimits(user);
    if (limits.cards_per_story === null) return true;
    return currentCardCount < limits.cards_per_story;
}

/**
 * Checks if a user is allowed to create another event in a story.
 */
export function canCreateEvent(
    user: { plan: PlanType; subscriptionStatus: SubscriptionStatus },
    currentEventCount: number
): boolean {
    const limits = getUserPlanLimits(user);
    if (limits.events_per_story === null) return true;
    return currentEventCount < limits.events_per_story;
}

/**
 * Checks if a user can generate a certain number of AI tokens.
 * This checks the dynamic token balance on the user object.
 */
export function canConsumeAITokens(userTokenBalance: number, tokensToConsume: number): boolean {
    return userTokenBalance >= tokensToConsume;
}

/**
 * Checks if a user can generate an image.
 */
export function canConsumeImageGen(userImgGenBalance: number, imgToGenerate: number = 1): boolean {
    return userImgGenBalance >= imgToGenerate;
}

/**
 * Formats a given plan name for display (e.g., 'free' => 'Free', 'shakespeare' => 'Shakespeare')
 */
export function formatPlanName(plan: PlanType): string {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
}
