declare module "virtual:grok-og-identity" {
  export const grokOgIdentity: {
    site: {
      title?: string;
      author?: string;
      origin_id?: string;
      description?: string;
      type?: string;
      card?: string;
      image?: string;
      banner?: string;
      color?: string;
    };
  };
}
