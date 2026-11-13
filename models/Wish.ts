import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const WishSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    from: { type: String, trim: true, maxlength: 80, default: "A proud teammate" },
  },
  { timestamps: true }
);

export type WishDoc = InferSchemaType<typeof WishSchema>;

export const Wish: Model<WishDoc> =
  (models.Wish as Model<WishDoc> | undefined) ?? model<WishDoc>("Wish", WishSchema);
