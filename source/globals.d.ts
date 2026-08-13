declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.css";

// eslint-plugin-jsx-a11y does not ship type declarations.
declare module "eslint-plugin-jsx-a11y";
