# Security Spec

## Data Invariants
1. Apps, Earning Apps, Products, Settings, and Announcements can only be created, updated, or deleted by the Admin (jiamit134kumar@gmail.com with verified email).
2. Ratings can be created by anyone (no auth required) but must have a valid itemId, itemType (apps|earning_apps|products), and rating between 1 and 5.
3. Views can be created by anyone (no auth required) to track page visits.
4. Total Ratings and Average Rating fields on items can be incremented/updated when a rating is created (by an admin process or atomic update, but since the frontend will create ratings directly and can't use admin SDK, maybe we allow anyone to update averageRating/totalRatings if properly validated? Wait, the rules must protect it. Actually, `allow update: if isAdmin()` is better, and we use a Firebase function or let the client compute it? Without functions, if we want the client to update rating stats, it's risky without auth. Let's let the client write a Rating. Then we just query ratings and compute on the client? The spec says "Average Rating, Total Rating Count. Display rating on Cards, Details Pages". It's easier if `apps` document has `averageRating` and `totalRatings`, and we allow anyone to update those specific fields when adding a rating, or we don't. Wait, the spec doesn't require Firebase functions. If we allow anyone to update `averageRating` and `totalRatings`, we must use `affectedKeys().hasOnly(['averageRating', 'totalRatings', 'updatedAt'])`. But how do we guarantee they did the math right? We can't in firestore rules. Better to let `isAdmin` update it? Actually, we'll try to let standard users only create ratings, and we'll calculate ratings dynamically on the client, or we will just let unauthenticated users update the stats.
Wait, "Admin cannot manually edit ratings", but anyone can add a rating.
Let's restrict `apps`, `earning_apps`, `products` updates to Admin only. When rendering items, we can query the `ratings` collection if we need to? Or we update ratings atomically and use `existsAfter`?
Actually, `getAfter` isn't fully supported for arbitrary math in rules. Let's just create ratings and we'll calculate them if needed, or we allow unauthenticated users to update the stats with strict boundaries.

## The Dirty Dozen Payloads
1. Unauthorized write to `apps` (not admin).
2. Unauthorized delete to `apps`.
3. Create `ratings` with invalid itemType.
4. Create `ratings` with rating > 5.
5. Create `ratings` with non-numeric rating.
6. Admin spoofing by using another email without email_verified.
7. Admin spoofing by setting admin in custom claims.
8. Updating `settings` by unauthenticated user.
9. Injecting HTML in `announcement` fields (though we just check size in rules).
10. Creating view without path.
11. Path variable poisoning (large string for appId).
12. Denial of wallet arrays (too many screenshots).

## Rules Logic

Admin check: `request.auth != null && request.auth.token.email == 'jiamit134kumar@gmail.com' && request.auth.token.email_verified == true`.
