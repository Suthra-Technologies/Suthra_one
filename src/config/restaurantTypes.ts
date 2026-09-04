/** Catalog of store / restaurant service types with cover imagery for cards & registration. */

export type RestaurantCategoryId =
  | 'food-restaurant'
  | 'health-wellness'
  | 'beverage-dessert'
  | 'food-service';

export interface RestaurantTypeOption {
  id: string;
  label: string;
  categoryId: RestaurantCategoryId;
  categoryLabel: string;
  /** Cover image shown on store cards / registration preview */
  coverUrl: string;
}

const COVER = {
  healthyCafe:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  fineDining:
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
  casualDining:
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
  burger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
  fastFood:
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=900&q=80',
  family:
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80',
  cafe:
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  bistro:
    'https://images.unsplash.com/photo-1466978913421-dad2ebd922d3?auto=format&fit=crop&w=900&q=80',
  foodCourt:
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
  cloudKitchen:
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80',
  foodTruck:
    'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=900&q=80',
  bakery:
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  pizza:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
  diner:
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
  buffet:
    'https://images.unsplash.com/photo-1551218808-94e275f38929?auto=format&fit=crop&w=900&q=80',
  seafood:
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
  barGrill:
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80',
  steakhouse:
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
  sushi:
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
  indian:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80',
  multiCuisine:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  salad:
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  juice:
    'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=900&q=80',
  smoothie:
    'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80',
  acai:
    'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=900&q=80',
  organic:
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80',
  vegan:
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  coffee:
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  tea:
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80',
  bubbleTea:
    'https://images.unsplash.com/photo-1558857563-b37103387363?auto=format&fit=crop&w=900&q=80',
  iceCream:
    'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=900&q=80',
  dessert:
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
  donut:
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80',
  chocolate:
    'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=900&q=80',
  catering:
    'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
  delivery:
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=80',
  wholesale:
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
} as const;

const def = (
  id: string,
  label: string,
  categoryId: RestaurantCategoryId,
  categoryLabel: string,
  coverUrl: string,
): RestaurantTypeOption => ({ id, label, categoryId, categoryLabel, coverUrl });

export const RESTAURANT_TYPES: RestaurantTypeOption[] = [
  // Food & Restaurant
  def('fine-dining-restaurant', 'Fine Dining Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.fineDining),
  def('casual-dining-restaurant', 'Casual Dining Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.casualDining),
  def('quick-service-restaurant', 'Quick Service Restaurant (QSR)', 'food-restaurant', 'Food & Restaurant', COVER.burger),
  def('fast-food-restaurant', 'Fast Food Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.fastFood),
  def('family-restaurant', 'Family Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.family),
  def('cafe', 'Café', 'food-restaurant', 'Food & Restaurant', COVER.cafe),
  def('bistro', 'Bistro', 'food-restaurant', 'Food & Restaurant', COVER.bistro),
  def('food-court', 'Food Court', 'food-restaurant', 'Food & Restaurant', COVER.foodCourt),
  def('cloud-kitchen', 'Cloud Kitchen', 'food-restaurant', 'Food & Restaurant', COVER.cloudKitchen),
  def('food-truck', 'Food Truck', 'food-restaurant', 'Food & Restaurant', COVER.foodTruck),
  def('bakery', 'Bakery', 'food-restaurant', 'Food & Restaurant', COVER.bakery),
  def('pizzeria', 'Pizzeria', 'food-restaurant', 'Food & Restaurant', COVER.pizza),
  def('diner', 'Diner', 'food-restaurant', 'Food & Restaurant', COVER.diner),
  def('buffet-restaurant', 'Buffet Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.buffet),
  def('seafood-restaurant', 'Seafood Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.seafood),
  def('bar-grill', 'Bar & Grill', 'food-restaurant', 'Food & Restaurant', COVER.barGrill),
  def('steakhouse', 'Steakhouse', 'food-restaurant', 'Food & Restaurant', COVER.steakhouse),
  def('sushi-restaurant', 'Sushi Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.sushi),
  def('indian-restaurant', 'Indian Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.indian),
  def('multi-cuisine-restaurant', 'Multi-Cuisine Restaurant', 'food-restaurant', 'Food & Restaurant', COVER.multiCuisine),

  // Health & Wellness
  def('healthy-food-cafe', 'Healthy Food Café', 'health-wellness', 'Health & Wellness Food', COVER.healthyCafe),
  def('salad-bar', 'Salad Bar', 'health-wellness', 'Health & Wellness Food', COVER.salad),
  def('juice-bar', 'Juice Bar', 'health-wellness', 'Health & Wellness Food', COVER.juice),
  def('smoothie-bar', 'Smoothie Bar', 'health-wellness', 'Health & Wellness Food', COVER.smoothie),
  def('acai-bowl-shop', 'Acai Bowl Shop', 'health-wellness', 'Health & Wellness Food', COVER.acai),
  def('organic-food-cafe', 'Organic Food Café', 'health-wellness', 'Health & Wellness Food', COVER.organic),
  def('vegan-restaurant', 'Vegan Restaurant', 'health-wellness', 'Health & Wellness Food', COVER.vegan),
  def('vegetarian-restaurant', 'Vegetarian Restaurant', 'health-wellness', 'Health & Wellness Food', COVER.vegan),
  def('health-food-store', 'Health Food Store', 'health-wellness', 'Health & Wellness Food', COVER.organic),
  def('nutrition-cafe', 'Nutrition Café', 'health-wellness', 'Health & Wellness Food', COVER.healthyCafe),

  // Beverage & Dessert
  def('coffee-shop', 'Coffee Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.coffee),
  def('tea-house', 'Tea House', 'beverage-dessert', 'Beverage & Dessert', COVER.tea),
  def('bubble-tea-shop', 'Bubble Tea Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.bubbleTea),
  def('juice-shop', 'Juice Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.juice),
  def('ice-cream-shop', 'Ice Cream Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.iceCream),
  def('gelato-shop', 'Gelato Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.iceCream),
  def('dessert-cafe', 'Dessert Café', 'beverage-dessert', 'Beverage & Dessert', COVER.dessert),
  def('donut-shop', 'Donut Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.donut),
  def('chocolate-shop', 'Chocolate Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.chocolate),
  def('frozen-yogurt-shop', 'Frozen Yogurt Shop', 'beverage-dessert', 'Beverage & Dessert', COVER.iceCream),

  // Food Service / Other
  def('catering-service', 'Catering Service', 'food-service', 'Food Service & Distribution', COVER.catering),
  def('meal-prep-business', 'Meal Prep Business', 'food-service', 'Food Service & Distribution', COVER.delivery),
  def('online-food-business', 'Online Food Business', 'food-service', 'Food Service & Distribution', COVER.delivery),
  def('delivery-kitchen', 'Delivery Kitchen', 'food-service', 'Food Service & Distribution', COVER.cloudKitchen),
  def('ghost-kitchen', 'Ghost Kitchen', 'food-service', 'Food Service & Distribution', COVER.cloudKitchen),
  def('mobile-food-vendor', 'Mobile Food Vendor', 'food-service', 'Food Service & Distribution', COVER.foodTruck),
  def('wholesale-food-business', 'Wholesale Food Business', 'food-service', 'Food Service & Distribution', COVER.wholesale),
  def('food-distributor', 'Food Distributor', 'food-service', 'Food Service & Distribution', COVER.wholesale),
];

export const RESTAURANT_TYPE_IDS = RESTAURANT_TYPES.map((t) => t.id);

export const RESTAURANT_TYPE_MAP = Object.fromEntries(
  RESTAURANT_TYPES.map((t) => [t.id, t]),
) as Record<string, RestaurantTypeOption>;

export const RESTAURANT_CATEGORIES = (
  ['food-restaurant', 'health-wellness', 'beverage-dessert', 'food-service'] as RestaurantCategoryId[]
).map((id) => {
  const first = RESTAURANT_TYPES.find((t) => t.categoryId === id)!;
  return {
    id,
    label: first.categoryLabel,
    types: RESTAURANT_TYPES.filter((t) => t.categoryId === id),
  };
});

export const DEFAULT_STORE_COVER = COVER.multiCuisine;

export function getRestaurantType(id?: string | null): RestaurantTypeOption | undefined {
  if (!id) return undefined;
  return RESTAURANT_TYPE_MAP[id];
}

export function getStoreCoverUrl(restaurantTypeId?: string | null): string {
  return getRestaurantType(restaurantTypeId)?.coverUrl || DEFAULT_STORE_COVER;
}

export function getRestaurantTypeLabel(restaurantTypeId?: string | null): string {
  return getRestaurantType(restaurantTypeId)?.label || 'Restaurant';
}

export function storeInitials(name?: string): string {
  if (!name?.trim()) return 'ST';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
