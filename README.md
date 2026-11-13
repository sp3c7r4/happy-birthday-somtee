# Happy Birthday, Somto

A one-page birthday site for Somto Ezepue from the Arthurite team. It includes:

- confetti that never stops falling
- a cake whose candles you blow out
- auto-flipping "Hall of Pride" cards
- a pop-the-balloon game
- a wish wall saved in MongoDB through Mongoose

## Run it locally

1. Install Node.js 18.18 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the database:

   ```bash
   cp .env.example .env.local
   ```

   Set `MONGODB_URI` in `.env.local` to your MongoDB connection string. A free MongoDB Atlas cluster works. If you use Atlas, allow your IP address, or `0.0.0.0/0` when you deploy. `MONGODB_DB` is optional and defaults to `somto_birthday`.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Then open http://localhost:3000

## Deploy (Vercel)

1. Push the project to GitHub and import it in Vercel.
2. Add `MONGODB_URI` (and optionally `MONGODB_DB`) under Project Settings > Environment Variables.
3. Deploy.

## Add photos

Put image files in `public/photos/`. Then set each `src` in `lib/content.ts`, for example:

```ts
export const portrait = { src: "/photos/portrait.jpg", alt: "Somto Ezepue" };
```

Any photo whose `src` is empty shows a labelled placeholder.

## Edit the words

All page copy lives in `lib/content.ts`: the ticker, the Hall of Pride cards, the balloon perks and the status rows.

## Wish API

| Method | Route         | Body                                | Notes                    |
| ------ | ------------- | ----------------------------------- | ------------------------ |
| GET    | `/api/wishes` | none                                | Newest 200 wishes        |
| POST   | `/api/wishes` | `{ "text": "...", "from": "..." }`  | text max 500, from max 80 |

The page reloads the wall every 15 seconds, so wishes other people pin show up on their own.

To remove an unwanted wish, delete it from the `wishes` collection in MongoDB Atlas (or with `mongosh`). The site has no admin screen.
