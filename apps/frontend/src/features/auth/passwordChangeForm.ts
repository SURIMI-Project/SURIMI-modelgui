import { z } from "zod";
import { passwordChangePayloadSchema } from "../../network/services/auth/authSchemas";

// Confirmation is a UI field only; the service sends current_password/new_password.
export const passwordChangeFormSchema = passwordChangePayloadSchema.extend({
  confirm_password: z.string().min(1, "Confirm your new password."),
}).refine((value) => value.new_password === value.confirm_password, {
  message: "The new passwords do not match.",
  path: ["confirm_password"],
});
