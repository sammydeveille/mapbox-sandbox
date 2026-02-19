import { z } from 'zod';

// Matches HTML tags like <script>, <b>, <img> but not math like "x > 5"
const HTML_TAG_REGEX = /<\s*[a-zA-Z][^>]*>/g;

export const noHtmlString = (options?: { min?: number; max?: number }) => 
  z.string()
    .refine(
      (val) => !HTML_TAG_REGEX.test(val),
      { message: 'HTML tags are not allowed' }
    )
    .transform((val) => val.trim())
    .pipe(
      z.string()
        .min(options?.min ?? 1, 'String cannot be empty')
        .max(options?.max ?? 5000, `String cannot exceed ${options?.max ?? 5000} characters`)
    );
