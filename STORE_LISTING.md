# Keep — App Store submission pack

Everything App Store Connect asks for, in the order you meet it. Copy each field verbatim; every
length was checked against Apple's limits on 28 Sep 2026.

## 1. App Information (App Store Connect → your app → General → App Information)

| Field | Value |
|---|---|
| Name (2–30 chars) | `Keep: GLP-1 Protein Tracker` (27) |
| Subtitle (≤30) | `Scan meals, protect muscle` (26) |
| Primary category | Health & Fitness |
| Secondary category | Food & Drink |
| Content rights | Does not contain, show, or access third-party content |
| Age rating | 13+ (answers in section 8) |
| Regulated medical device | **No** (required for new Health & Fitness apps in the US, UK and EEA since 26 Mar 2026) |

The app record currently shows the name "Keep - GLP1". Change it here before submitting; the name
is only editable until the version is submitted.

## 2. Version page (Distribution → iOS App → 1.0.1)

### Promotional text (≤170, editable any time without review)

```
Up to 40% of weight lost on GLP-1 medication can be lean mass, including muscle. Keep helps you protect yours: scan meals, hit your protein floor, keep your streak.
```

### Keywords (≤100 bytes, each keyword longer than two characters)

```
semaglutide,tirzepatide,glp1,weight,loss,calorie,macro,food,photo,diet,nutrition,shot,injection,lean
```

100 bytes. No word repeats the name or subtitle (Apple already indexes those). Drug brand names
(Ozempic, Wegovy, Mounjaro, Zepbound) are deliberately left out: they are trademarks, and Apple
forbids trademarked terms and other companies' names in keywords (guideline 2.3.7). They appear
only descriptively in the description, with ® and an attribution line.

### Description (≤4,000, plain text)

```
Up to 40% of the weight lost on GLP-1 medication can be lean mass, including muscle. Keep is the protein tracker built for people taking semaglutide or tirzepatide medications such as Ozempic®, Wegovy®, Mounjaro®, and Zepbound®. It helps you protect the muscle that keeps your strength, metabolism, and shape while the weight comes off.

YOUR DAILY PROTEIN FLOOR
Calorie apps are built to make you eat less. On a GLP-1, the harder problem is eating enough protein when your appetite is quiet. Keep sets a personal daily protein floor from published clinical guidance of 1.2 to 1.6 g of protein per kg of body weight (Keep uses the 1.4 g midpoint) and shows you exactly how much is left today.

SNAP ANY MEAL
Point your camera at your plate. Keep estimates the protein, calories, and carbs in seconds, and tells you how far the meal gets you toward today's floor. Prefer typing? Log any meal by hand in a few taps.

MUSCLE GUARD SCORE
One weekly number built from your protein floor, your strength sessions, and your rate of weight loss. The scale shows how much you lost. Your Muscle Guard score shows whether your habits are protecting your muscle, and what to fix next week.

STREAKS WITH SHOT-DAY GRACE
Build a daily protein streak and earn Bronze, Silver, and Gold shields. Appetite often dips after an injection, so your streak never breaks on your shot day.

A PLAN BUILT AROUND YOUR SHOT DAY
Tell Keep your shot day, weight, and training habits. You get a daily protein number, a realistic per-meal target for a smaller appetite, and a heads-up on shot days when appetite dips. Use pounds or kilograms.

PRIVATE BY DESIGN
No account needed. Your plan, meals, and weigh-ins stay on your phone. With your permission, meal photos are sent securely to OpenAI for analysis. Keep doesn't store your photos, and they aren't used to train AI models.

Keep provides general nutrition tracking and is not medical advice. It does not provide dosing guidance. Always follow your prescriber's instructions for your medication and diet.

KEEP PRO SUBSCRIPTION
Keep is free to download. Keep Pro unlocks the full app and is available as a yearly subscription with a 3-day free trial, or as a weekly subscription. Prices are shown in the app before you buy and may vary by country.
- Payment is charged to your Apple ID account at confirmation of purchase, or when a free trial ends.
- Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the end of the current period.
- Manage or cancel anytime in your Apple ID account settings (Settings > your name > Subscriptions). Any unused portion of a free trial is forfeited when you purchase a subscription.

Terms of Use (EULA): https://keep-scan.shipfastvc.workers.dev/terms
Privacy Policy: https://keep-scan.shipfastvc.workers.dev/privacy
Support: https://keep-scan.shipfastvc.workers.dev/support

Ozempic® and Wegovy® are registered trademarks of Novo Nordisk A/S. Mounjaro® and Zepbound® are registered trademarks of Eli Lilly and Company. Keep is not affiliated with or endorsed by either company.
```

### URLs

| Field | Value |
|---|---|
| Support URL | `https://keep-scan.shipfastvc.workers.dev/support` |
| Marketing URL | leave empty |
| Privacy Policy URL (App Privacy section) | `https://keep-scan.shipfastvc.workers.dev/privacy` |

### Other version fields

| Field | Value |
|---|---|
| Copyright | `2026 Yu Zhou` |
| What's New | not shown for a first release |
| Build | the newest 1.0.1 build (it must include the AI-consent prompt, see section 9) |
| Version release | Manually release (recommended, so you pick launch day) |

### Screenshots (one iPhone set is enough)

Upload `01.png` … `06.png` in this order. Use the set that matches the slot App Store Connect shows:

- **iPhone 6.9" Display:** `store-screenshots/01…06.png` (1320×2868)
- **iPhone 6.5" Display:** `store-screenshots/6.5-inch/01…06.png` (1284×2778). The 6.5" slot
  rejects 6.9" files with a "dimensions are wrong" error.

All are opaque RGB PNGs. App Store Connect scales them down for every smaller iPhone. No iPad set
is needed (`supportsTablet: false`).

| # | Caption | Screen shown |
|---|---|---|
| 1 | Lose fat, not muscle. | Home with the protein-floor ring (96/128g) |
| 2 | Snap your meal, see the protein. | Scan result for a poke bowl (32g protein) |
| 3 | Know it's working. | Muscle Guard score (83) and its breakdown |
| 4 | Shot day? Streak's safe. | 12-day fire streak, shields, shot-day grace calendar |
| 5 | Get your protein number. | Plan reveal (128g a day) |
| 6 | Same loss. Different body. | 12-week projection, with its in-app disclaimer |

Search results show only the first three, so 1–3 carry the whole promise → snap → proof loop.

## 3. App Review Information

Sign-in required: **No**. Contact: your name, phone, and `info@shipfast.agency`.

Notes:

```
Keep is a consumer nutrition tracker for people taking GLP-1 medications. It logs protein and gives general nutrition information. It does not diagnose, treat, or give medication or dosing guidance, and it is not a medical device. No account or login is required.

How to review:
1. Launch the app and answer the setup questions (any answers work).
2. After the plan preview, the Keep Pro paywall appears. The subscriptions keep_pro_yearly (3-day free trial) and keep_pro_weekly are submitted with this version; please subscribe with a Sandbox account.
3. On the home screen, tap "Scan a meal" and point the camera at any food. The first time you tap the shutter, Keep asks permission to send the photo to OpenAI for analysis (guideline 5.1.2(i)); tap Allow. An estimate appears within a few seconds. Without food nearby, tap "Type it instead" to log a meal manually.
4. Tap the Muscle Guard card for the score breakdown, and the streak card for streaks and shields. Settings has subscription management, the privacy policy, and the terms of use.

Data: the plan, meals, and weigh-ins are stored only on the device. Meal photos leave the device only after the user allows it; they are sent over HTTPS to our server and OpenAI for analysis and are not stored by us.
```

## 4. In-app purchases (Monetization → Subscriptions → "Keep Pro" group)

| | Yearly | Weekly |
|---|---|---|
| Product ID | `keep_pro_yearly` | `keep_pro_weekly` |
| Reference name | Keep Pro Yearly | Keep Pro Weekly |
| Duration | 1 year | 1 week |
| Price | $49.99 | $6.99 |
| Introductory offer | Free trial, 3 days, new subscribers | none |
| Display name | `Keep Pro Yearly` | `Keep Pro Weekly` |
| Description | `Full access: scans, score, streaks` | `Full access: scans, score, streaks` |
| Review screenshot | `review-shot-yearly.png` (640×920) | `review-shot-weekly.png` (640×920) |

Subscription group display name: `Keep Pro`. Both subscriptions must show **Ready to Submit** and be
added to the 1.0.1 version (the "In-App Purchases and Subscriptions" box on the version page) before
you submit. A first subscription can only be approved together with an app version.

## 5. Pricing and availability

Price: **Free** (revenue comes from the subscription). Availability: all countries and regions.
The app is English-only, which is fine.

## 6. App Privacy (the "nutrition label")

Privacy Policy URL: `https://keep-scan.shipfastvc.workers.dev/privacy`

"Do you or your third-party partners collect data from this app?" → **Yes**. Declare exactly two
data types:

| Data type | Collected because | Purposes | Linked to the user? | Used for tracking? |
|---|---|---|---|---|
| Photos or Videos | Meal photos go to OpenAI, which may keep API inputs up to 30 days for abuse monitoring, so they don't qualify as "transient" | App Functionality | No | No |
| Purchases → Purchase History | RevenueCat records subscription state under an anonymous ID | App Functionality, Analytics (RevenueCat's own guidance) | No | No |

Everything else is **not collected**:
- Health & Fitness: weight, meals, lifts and scores never leave the phone, and the scan request
  contains only the photo.
- Contact info and identifiers: there are no accounts, and RevenueCat uses its anonymous ID.
- Usage data and diagnostics: the production build ships without the PostHog key, so no analytics
  SDK runs.

The label will read "Data Not Linked to You: Photos or Videos, Purchases". If you later turn on
PostHog or account sync, update this label and the privacy policy first.

## 7. Content rights and export compliance

- Content rights: the app doesn't show third-party content.
- Encryption: standard HTTPS only, which is exempt. If asked, answer "None of the algorithms
  mentioned above".

## 8. Age rating answers (App Information → Age Rating → Edit)

| Question | Answer |
|---|---|
| Parental controls / age assurance | No / No |
| Unrestricted web access | No (links open in Safari, not an in-app browser) |
| User-generated content, messaging, social media features | No |
| Advertising | No |
| Profanity, horror, violence, sexual content, gambling, contests | None |
| Alcohol, tobacco, or drug use or references | None (prescription medication is covered by the medical question below) |
| Medical or treatment information | **Infrequent** (shot-day appetite tips around a prescription medication) |
| Health or wellness topics | **Yes** (protein tracking and nutrition) |

Result: **13+**. The honest reading of "infrequent medical information" costs nothing here, since
everyone on a GLP-1 prescription is an adult. Don't pick "Frequent": that means 16+, and Keep
doesn't give treatment guidance. The Terms of Use set no minimum age, so no override is needed.

## 9. Before you press Submit

1. Make a new production build. The build on TestFlight predates the AI-consent prompt that
   guideline 5.1.2(i) requires.
   ```
   eas build -p ios --profile production
   ```
2. Upload it to App Store Connect.
   ```
   eas submit -p ios --latest
   ```
3. On the 1.0.1 version page, fill in everything above, select the new build, and add both
   subscriptions.
4. Submit for review.

## 10. Watch-outs

- **Individual developer account.** Guideline 5.1.1(ix) says apps in highly regulated fields such as
  healthcare should come from a legal entity. Keep is a consumer nutrition tracker, not a
  healthcare service, and the review notes say so up front. If a reviewer cites 5.1.1(ix) anyway,
  the fix is an Organization developer account (needs a D-U-N-S number) and an app transfer.
- **Trademarks.** Brand drug names stay out of the name, subtitle, keywords and screenshots. They
  appear only in the description, with ® and the attribution line.
- **"Muscle Guard."** Noom markets a GLP-1 feature called "Muscle Defense™". "Muscle Guard" is a
  different mark and low risk, but don't drift toward "Defense" wording.
- **Health claims.** Keep the "can be" hedge on the 40% lean-mass figure, and never show results or
  ratings you can't verify. The projection screenshot keeps its in-app disclaimer visible.

## 11. When accounts ship (version 1.1)

Accounts live on the `accounts` branch. Before submitting a build that includes them:

- **App Privacy:** add three data types, all **linked to the user** and **not used for tracking**:

  | Data type | Purposes |
  |---|---|
  | Contact Info → Email Address | App Functionality, Developer's Advertising or Marketing |
  | Health & Fitness → Fitness (weight, meals and lifts in the cloud backup) | App Functionality |
  | Identifiers → User ID | App Functionality |

  Also change Purchases → Purchase History to **linked**, because RevenueCat now uses the account ID.
- **Privacy policy:** deploy the accounts version of the privacy policy from the backend's
  `accounts` branch at the same time.
- **Review notes:** add "Sign in with Apple is optional (Save your plan → Not now skips it). To
  delete an account: Settings → Delete account."
