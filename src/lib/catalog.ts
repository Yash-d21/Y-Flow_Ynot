/**
 * Category inference — safe for client and server (no Node builtins).
 */
export function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/tumbler|bottle|mug|cup|drinkware|hydrapeak|miir|rtic|icool|camel|stanley|yeti|glass/.test(n))
    return "Drinkware";
  if (/tee|t-shirt|shirt|hoodie|fleece|jacket|jogger|jersey|polo|apparel|sweatshirt/.test(n))
    return "Apparel";
  if (/hat|cap|trucker|beanie/.test(n)) return "Headwear";
  if (/bag|backpack|tote|pack|cooler|pouch|case|organizer/.test(n)) return "Bags";
  if (/blanket|throw|picnic|sherpa/.test(n)) return "Blankets & Outdoor";
  if (/notebook|journal|moleskine|pen|stationary|notepad/.test(n)) return "Stationery";
  if (/tech|charger|power|usb|earbud|speaker/.test(n)) return "Tech";
  if (/gift|kit|set/.test(n)) return "Gift Sets";
  return "Premium Brands";
}

export type ExportProduct = {
  id: number;
  name: string;
  slug: string;
  price: string;
  price_usd: number;
  image_url: string | null;
  local_image: string | null;
  store?: string;
  source?: string;
};
