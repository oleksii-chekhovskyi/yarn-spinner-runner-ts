/**
 * Type declarations for CSS module imports
 * This allows TypeScript to recognize CSS imports without errors
 */
declare module "*.css" {
  const content: string;
  export default content;
}

